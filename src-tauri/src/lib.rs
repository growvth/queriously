mod commands;
mod db;
mod hashing;
mod paths;

use commands::AppState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let db = db::open().expect("failed to open database");

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .manage(AppState { db })
        .invoke_handler(tauri::generate_handler![
            commands::pdf::open_pdf,
            commands::pdf::get_library,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
