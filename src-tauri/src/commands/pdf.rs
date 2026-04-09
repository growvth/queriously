use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::State;

use crate::commands::AppState;
use crate::hashing::sha256_file;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Paper {
    pub id: String,
    pub file_path: String,
    pub title: Option<String>,
    pub authors: Option<String>,
    pub year: Option<i64>,
    pub page_count: Option<i64>,
    pub date_added: i64,
    pub last_opened: Option<i64>,
    pub is_indexed: bool,
    pub marginalia_done: bool,
}

fn now_secs() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0)
}

/// Open a PDF: hash it, upsert into the library, and return the paper row.
/// Indexing is triggered separately by the Python sidecar (step 7).
#[tauri::command]
pub async fn open_pdf(path: String, state: State<'_, AppState>) -> Result<Paper, String> {
    let p = PathBuf::from(&path);
    if !p.exists() {
        return Err(format!("file not found: {path}"));
    }
    let id = sha256_file(&p).map_err(|e| e.to_string())?;
    let title = p
        .file_stem()
        .and_then(|s| s.to_str())
        .map(|s| s.to_string());
    let now = now_secs();

    let db = state.db.lock();
    db.execute(
        "INSERT INTO papers (id, file_path, title, date_added, last_opened)
         VALUES (?1, ?2, ?3, ?4, ?4)
         ON CONFLICT(id) DO UPDATE SET
             file_path = excluded.file_path,
             last_opened = excluded.last_opened",
        rusqlite::params![&id, &path, &title, now],
    )
    .map_err(|e| e.to_string())?;

    read_paper(&db, &id).map_err(|e| e.to_string())
}

/// Return all papers in the library, most-recently-opened first.
#[tauri::command]
pub fn get_library(state: State<'_, AppState>) -> Result<Vec<Paper>, String> {
    let db = state.db.lock();
    let mut stmt = db
        .prepare(
            "SELECT id, file_path, title, authors, year, page_count,
                    date_added, last_opened, is_indexed, marginalia_done
               FROM papers
              ORDER BY COALESCE(last_opened, date_added) DESC",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], row_to_paper)
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;
    Ok(rows)
}

fn read_paper(db: &rusqlite::Connection, id: &str) -> rusqlite::Result<Paper> {
    db.query_row(
        "SELECT id, file_path, title, authors, year, page_count,
                date_added, last_opened, is_indexed, marginalia_done
           FROM papers WHERE id = ?1",
        [id],
        row_to_paper,
    )
}

fn row_to_paper(row: &rusqlite::Row) -> rusqlite::Result<Paper> {
    Ok(Paper {
        id: row.get(0)?,
        file_path: row.get(1)?,
        title: row.get(2)?,
        authors: row.get(3)?,
        year: row.get(4)?,
        page_count: row.get(5)?,
        date_added: row.get(6)?,
        last_opened: row.get(7)?,
        is_indexed: row.get::<_, i64>(8)? != 0,
        marginalia_done: row.get::<_, i64>(9)? != 0,
    })
}
