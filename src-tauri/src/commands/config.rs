use serde::{Deserialize, Serialize};
use tauri::State;

use crate::sidecar::{base_url, SidecarHandle};

const KEYCHAIN_SERVICE: &str = "com.queriously.desktop";
const KEYCHAIN_ACCOUNT: &str = "llm_api_key";

#[derive(Debug, Serialize, Deserialize)]
pub struct LlmConfig {
    pub model: String,
    pub api_key: Option<String>,
    pub base_url: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct OllamaStatus {
    pub running: bool,
    pub models: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AiReadiness {
    pub ready: bool,
    pub status: String,
    pub detail: String,
    pub model: String,
}

fn keyring_entry() -> Result<keyring::Entry, String> {
    keyring::Entry::new(KEYCHAIN_SERVICE, KEYCHAIN_ACCOUNT).map_err(|e| e.to_string())
}

/// Read the saved LLM API key from the OS keychain.
#[tauri::command]
pub fn get_llm_api_key() -> Result<Option<String>, String> {
    let entry = keyring_entry()?;
    match entry.get_password() {
        Ok(value) => Ok(Some(value)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

/// Save or clear the LLM API key in the OS keychain.
#[tauri::command]
pub fn set_llm_api_key(api_key: Option<String>) -> Result<(), String> {
    let entry = keyring_entry()?;
    let normalized = api_key.and_then(|s| {
        let trimmed = s.trim().to_string();
        if trimmed.is_empty() {
            None
        } else {
            Some(trimmed)
        }
    });

    match normalized {
        Some(value) => entry.set_password(&value).map_err(|e| e.to_string()),
        None => match entry.delete_credential() {
            Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
            Err(e) => Err(e.to_string()),
        },
    }
}

/// Push LLM config to the Python sidecar so it takes effect at runtime.
#[tauri::command]
pub async fn update_llm_config(
    config: LlmConfig,
    state: State<'_, SidecarHandle>,
) -> Result<(), String> {
    let Some(url) = base_url(&state) else {
        return Err("sidecar not ready".into());
    };
    let client = reqwest::Client::new();
    let resp = client
        .post(format!("{url}/config/llm"))
        .json(&config)
        .timeout(std::time::Duration::from_secs(5))
        .send()
        .await
        .map_err(|e| format!("config update failed: {e}"))?;
    if !resp.status().is_success() {
        return Err(format!("config update returned {}", resp.status()));
    }
    Ok(())
}

/// Check if Ollama is running locally (via the sidecar's detection endpoint).
#[tauri::command]
pub async fn check_ollama(state: State<'_, SidecarHandle>) -> Result<OllamaStatus, String> {
    let Some(url) = base_url(&state) else {
        return Ok(OllamaStatus {
            running: false,
            models: vec![],
        });
    };
    let client = reqwest::Client::new();
    let resp = client
        .get(format!("{url}/ollama/status"))
        .timeout(std::time::Duration::from_secs(5))
        .send()
        .await
        .map_err(|e| format!("ollama check failed: {e}"))?;
    let status: OllamaStatus = resp
        .json()
        .await
        .map_err(|e| format!("parse ollama status: {e}"))?;
    Ok(status)
}

/// Check if the configured LLM provider is usable enough for user sends.
#[tauri::command]
pub async fn check_ai_readiness(state: State<'_, SidecarHandle>) -> Result<AiReadiness, String> {
    let Some(url) = base_url(&state) else {
        return Ok(AiReadiness {
            ready: false,
            status: "sidecar_offline".into(),
            detail: "Python sidecar is not ready.".into(),
            model: "".into(),
        });
    };
    let client = reqwest::Client::new();
    let resp = client
        .get(format!("{url}/config/readiness"))
        .timeout(std::time::Duration::from_secs(5))
        .send()
        .await
        .map_err(|e| format!("readiness check failed: {e}"))?;
    if !resp.status().is_success() {
        return Ok(AiReadiness {
            ready: false,
            status: "readiness_error".into(),
            detail: format!("Readiness check returned {}", resp.status()),
            model: "".into(),
        });
    }
    resp.json()
        .await
        .map_err(|e| format!("parse readiness status: {e}"))
}
