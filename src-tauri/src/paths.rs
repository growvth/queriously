use std::path::PathBuf;

/// Root directory for all Queriously data, `~/.queriously`.
pub fn root_dir() -> PathBuf {
    dirs::home_dir()
        .expect("home dir must be resolvable")
        .join(".queriously")
}

pub fn db_dir() -> PathBuf {
    root_dir().join("db")
}
pub fn vectors_dir() -> PathBuf {
    root_dir().join("vectors")
}
pub fn cache_dir() -> PathBuf {
    root_dir().join("cache")
}
pub fn exports_dir() -> PathBuf {
    root_dir().join("exports")
}

pub fn db_file() -> PathBuf {
    db_dir().join("queriously.db")
}

/// Ensure the runtime directory layout exists on disk.
pub fn ensure_dirs() -> std::io::Result<()> {
    for d in [db_dir(), vectors_dir(), cache_dir(), exports_dir()] {
        std::fs::create_dir_all(&d)?;
    }
    Ok(())
}
