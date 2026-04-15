use serde::{Deserialize, Serialize};
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::State;

use crate::commands::AppState;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Session {
    pub id: String,
    pub name: String,
    pub research_question: String,
    pub created_at: i64,
    pub updated_at: Option<i64>,
    pub paper_count: i64,
}

fn now_secs() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0)
}

#[tauri::command]
pub fn get_sessions(state: State<'_, AppState>) -> Result<Vec<Session>, String> {
    let db = state.db.lock();
    let mut stmt = db
        .prepare(
            "SELECT s.id, s.name, s.research_question, s.created_at, s.updated_at,
                    COUNT(sp.paper_id) AS paper_count
               FROM sessions s
          LEFT JOIN session_papers sp ON sp.session_id = s.id
           GROUP BY s.id, s.name, s.research_question, s.created_at, s.updated_at
           ORDER BY COALESCE(s.updated_at, s.created_at) DESC",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| {
            Ok(Session {
                id: row.get(0)?,
                name: row.get(1)?,
                research_question: row.get(2)?,
                created_at: row.get(3)?,
                updated_at: row.get(4)?,
                paper_count: row.get(5)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(rows)
}

#[tauri::command]
pub fn create_session(
    name: String,
    research_question: String,
    state: State<'_, AppState>,
) -> Result<Session, String> {
    let trimmed_name = name.trim();
    let trimmed_question = research_question.trim();
    if trimmed_name.is_empty() {
        return Err("session name is required".into());
    }
    if trimmed_question.is_empty() {
        return Err("research question is required".into());
    }

    let id = uuid::Uuid::new_v4().to_string();
    let now = now_secs();
    let db = state.db.lock();
    db.execute(
        "INSERT INTO sessions (id, name, research_question, created_at, updated_at, synthesis_stale)
         VALUES (?1, ?2, ?3, ?4, ?4, 1)",
        rusqlite::params![&id, trimmed_name, trimmed_question, now],
    )
    .map_err(|e| e.to_string())?;

    Ok(Session {
        id,
        name: trimmed_name.to_string(),
        research_question: trimmed_question.to_string(),
        created_at: now,
        updated_at: Some(now),
        paper_count: 0,
    })
}

#[tauri::command]
pub fn add_paper_to_session(
    session_id: String,
    paper_id: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let now = now_secs();
    let db = state.db.lock();
    db.execute(
        "INSERT OR IGNORE INTO session_papers (session_id, paper_id, added_at)
         VALUES (?1, ?2, ?3)",
        rusqlite::params![&session_id, &paper_id, now],
    )
    .map_err(|e| e.to_string())?;
    db.execute(
        "UPDATE sessions
            SET updated_at = ?2,
                synthesis_stale = 1
          WHERE id = ?1",
        rusqlite::params![&session_id, now],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}
