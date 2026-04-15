use parking_lot::Mutex;
use serde::Deserialize;
use std::io::{BufRead, BufReader};
use std::process::{Child, Command, Stdio};
use std::sync::Arc;
use std::time::Duration;

/// Runtime state for the Python sidecar: the spawned child process and the
/// HTTP port it bound to (discovered via the stdout handshake).
pub struct SidecarState {
    pub port: Option<u16>,
    pub child: Option<Child>,
}

pub type SidecarHandle = Arc<Mutex<SidecarState>>;

#[derive(Debug, Deserialize)]
struct Handshake {
    status: String,
    port: u16,
}

/// Locate the directory that contains `python/main.py`.
///
/// Search order:
///  1. Bundled app resources: `Queriously.app/Contents/Resources/python/main.py`
///  2. Walk up from the executable (dev builds, cargo run)
///  3. cwd / cwd/.. (tauri dev, running from repo root)
///
/// Returns the directory whose `python/main.py` child exists.
fn find_python_root() -> Option<std::path::PathBuf> {
    let has_python = |dir: &std::path::Path| dir.join("python").join("main.py").exists();

    // 1. Bundled .app: Resources dir is a sibling of the MacOS dir containing the binary.
    //    exe = .app/Contents/MacOS/queriously → .app/Contents/Resources
    if let Ok(exe) = std::env::current_exe().and_then(std::fs::canonicalize) {
        if let Some(macos_dir) = exe.parent() {
            let resources = macos_dir.with_file_name("Resources");
            if has_python(&resources) {
                eprintln!("[sidecar] found python in app bundle Resources");
                return Some(resources);
            }
        }
    }

    // 2. Walk up from the executable (dev / release binary in repo tree).
    if let Ok(exe) = std::env::current_exe().and_then(std::fs::canonicalize) {
        let mut dir = exe.as_path();
        for _ in 0..10 {
            if let Some(parent) = dir.parent() {
                dir = parent;
                if has_python(dir) {
                    return Some(dir.to_path_buf());
                }
            } else {
                break;
            }
        }
    }

    // 3. Check cwd (running from repo root).
    if let Ok(cwd) = std::env::current_dir() {
        if has_python(&cwd) {
            return Some(cwd);
        }
        // 4. Check parent of cwd (tauri dev runs from src-tauri/).
        let parent = cwd.join("..");
        if has_python(&parent) {
            return std::fs::canonicalize(parent).ok();
        }
    }

    None
}

/// Locate the bundled Python sidecar entry point. For local dev we fall back
/// to the repo's `python/main.py` invoked via the system Python. Phase 4 will
/// swap this for a PyInstaller-bundled binary (OQ-02 in the spec).
/// Find the venv python3 binary. Checks:
///  1. Repo root baked in at compile time (CARGO_MANIFEST_DIR/../python/.venv)
///  2. Walking up from the executable (dev builds inside repo tree)
///  3. cwd / cwd/..
fn find_venv_python() -> Option<String> {
    let venv_bin = |dir: &std::path::Path| {
        let p = dir.join("python").join(".venv").join("bin").join("python3");
        if p.exists() { Some(p.to_string_lossy().into_owned()) } else { None }
    };

    // 1. Compile-time repo root: CARGO_MANIFEST_DIR is src-tauri/, join .. to get repo root.
    let repo_root = std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("..");
    if let Ok(repo) = std::fs::canonicalize(&repo_root) {
        if let Some(bin) = venv_bin(&repo) {
            return Some(bin);
        }
    }

    // 2. Walk up from the executable.
    if let Ok(exe) = std::env::current_exe().and_then(std::fs::canonicalize) {
        let mut dir = exe.as_path();
        for _ in 0..10 {
            if let Some(parent) = dir.parent() {
                dir = parent;
                if let Some(bin) = venv_bin(dir) {
                    return Some(bin);
                }
            } else {
                break;
            }
        }
    }

    // 3. Check cwd and cwd/..
    if let Ok(cwd) = std::env::current_dir() {
        if let Some(bin) = venv_bin(&cwd) {
            return Some(bin);
        }
        if let Some(bin) = venv_bin(&cwd.join("..")) {
            return Some(bin);
        }
    }

    None
}

fn sidecar_command() -> Option<Command> {
    let root = find_python_root()?;

    // Find the venv python (may be in a different location than the source
    // when running from a bundled .app where source is in Resources/).
    let python_bin = find_venv_python()
        .or_else(|| std::env::var("QUERIOUSLY_PYTHON").ok())
        .unwrap_or_else(|| "python3".into());

    eprintln!("[sidecar] using python: {python_bin}");
    eprintln!("[sidecar] python root: {}", root.display());

    // Run as `python -m python.main` from the root dir so relative imports work.
    let mut cmd = Command::new(python_bin);
    cmd.args(["-m", "python.main"]);
    cmd.current_dir(&root);
    cmd.stdout(Stdio::piped());
    cmd.stderr(Stdio::piped());
    Some(cmd)
}

/// Spawn the sidecar and block until it announces its port (or we give up).
/// Returns a handle the Tauri state layer can hold onto for the app lifetime.
pub fn spawn() -> SidecarHandle {
    let state = Arc::new(Mutex::new(SidecarState {
        port: None,
        child: None,
    }));

    let Some(mut cmd) = sidecar_command() else {
        eprintln!("[sidecar] entry point not found; AI features will be disabled");
        return state;
    };

    let mut child = match cmd.spawn() {
        Ok(c) => c,
        Err(e) => {
            eprintln!("[sidecar] failed to spawn python sidecar: {e}");
            return state;
        }
    };

    // Read the first stdout line in a worker thread so we don't block startup
    // forever if the sidecar never comes up.
    let stdout = child.stdout.take().expect("stdout piped");
    let state_for_reader = state.clone();
    std::thread::spawn(move || {
        let mut reader = BufReader::new(stdout);
        let mut line = String::new();
        if reader.read_line(&mut line).is_ok() {
            if let Ok(hs) = serde_json::from_str::<Handshake>(line.trim()) {
                if hs.status == "ready" {
                    state_for_reader.lock().port = Some(hs.port);
                    eprintln!("[sidecar] ready on port {}", hs.port);
                }
            } else {
                eprintln!("[sidecar] unexpected handshake: {}", line.trim());
            }
        }
        // Drain remaining stdout so the pipe buffer never fills up.
        for l in reader.lines().flatten() {
            eprintln!("[sidecar] {l}");
        }
    });

    state.lock().child = Some(child);

    // Grace period so the handshake can land before the UI asks for it.
    // The sidecar may take a few seconds to start (loading ML libraries).
    std::thread::sleep(Duration::from_secs(3));
    state
}

/// Return the base URL of the sidecar HTTP server, or `None` if it isn't ready.
pub fn base_url(handle: &SidecarHandle) -> Option<String> {
    handle.lock().port.map(|p| format!("http://127.0.0.1:{p}"))
}

/// Best-effort cleanup on app shutdown.
pub fn shutdown(handle: &SidecarHandle) {
    if let Some(mut child) = handle.lock().child.take() {
        let _ = child.kill();
        let _ = child.wait();
    }
}
