pub mod pdf;

use crate::db::DbHandle;

/// Shared application state made available to every Tauri command through
/// `tauri::State`.
pub struct AppState {
    pub db: DbHandle,
}
