use reqwest::Client;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, State};

use crate::commands::AppState;
use crate::sidecar::{base_url, SidecarHandle};

static HTTP: std::sync::LazyLock<Client> = std::sync::LazyLock::new(Client::new);

// ---------- Ingest ----------

#[derive(Debug, Serialize)]
struct IngestBody {
    paper_id: String,
    file_path: String,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct PaperMetadata {
    pub title: Option<String>,
    pub authors: Option<String>,
    pub r#abstract: Option<String>,
    pub year: Option<i64>,
    pub page_count: i64,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct IngestResult {
    pub paper_id: String,
    pub chunk_count: i64,
    pub equation_count: i64,
    pub citation_count: i64,
    pub metadata: PaperMetadata,
}

/// Proxy to the Python sidecar's /ingest endpoint. After ingestion succeeds
/// we update the papers table with the extracted metadata so the library
/// view can show titles/authors/page counts even after the sidecar restarts.
#[tauri::command]
pub async fn ingest_paper(
    paper_id: String,
    file_path: String,
    app: AppHandle,
    sidecar: State<'_, SidecarHandle>,
    db_state: State<'_, AppState>,
) -> Result<IngestResult, String> {
    let url = base_url(&sidecar).ok_or("sidecar not ready")?;

    let _ = app.emit("ingest:progress", serde_json::json!({
        "paper_id": &paper_id, "step": "starting", "percent": 0
    }));

    let resp = reqwest::Client::new()
        .post(format!("{url}/ingest"))
        .json(&IngestBody {
            paper_id: paper_id.clone(),
            file_path,
        })
        .timeout(std::time::Duration::from_secs(300))
        .send()
        .await
        .map_err(|e| format!("ingest request failed: {e}"))?;

    if !resp.status().is_success() {
        let body = resp.text().await.unwrap_or_default();
        return Err(format!("ingest returned error: {body}"));
    }

    let result: IngestResult = resp.json().await.map_err(|e| e.to_string())?;

    // Persist metadata back into SQLite so the library shows it even offline.
    {
        let db = db_state.db.lock();
        let _ = db.execute(
            "UPDATE papers SET title = COALESCE(?2, title),
                               authors = COALESCE(?3, authors),
                               abstract = COALESCE(?4, abstract),
                               year = COALESCE(?5, year),
                               page_count = COALESCE(?6, page_count),
                               is_indexed = 1
              WHERE id = ?1",
            rusqlite::params![
                &result.paper_id,
                &result.metadata.title,
                &result.metadata.authors,
                &result.metadata.r#abstract,
                &result.metadata.year,
                &result.metadata.page_count,
            ],
        );
    }

    let _ = app.emit("ingest:complete", serde_json::json!({
        "paper_id": &paper_id,
        "chunk_count": result.chunk_count,
    }));

    Ok(result)
}

// ---------- QA ----------

#[derive(Debug, Serialize)]
struct QABody {
    question: String,
    paper_id: String,
    chat_session_id: String,
    reading_mode: String,
    context_paper_ids: Vec<String>,
    context_override: Option<String>,
    top_k: i32,
}

/// Proxy the QA request to the Python sidecar's SSE /qa endpoint. We read the
/// SSE stream line by line and re-emit each token as a Tauri event so the
/// React chat panel can stream them in real time. When the `done` event
/// arrives we forward the full payload (answer + sources + mode extras).
#[tauri::command]
pub async fn ask_question(
    question: String,
    paper_id: String,
    chat_session_id: String,
    reading_mode: String,
    context_paper_ids: Vec<String>,
    context_override: Option<String>,
    top_k: i32,
    app: AppHandle,
    sidecar: State<'_, SidecarHandle>,
) -> Result<(), String> {
    let url = base_url(&sidecar).ok_or("sidecar not ready")?;

    let resp = HTTP
        .post(format!("{url}/qa"))
        .json(&QABody {
            question,
            paper_id,
            chat_session_id: chat_session_id.clone(),
            reading_mode,
            context_paper_ids,
            context_override,
            top_k,
        })
        .timeout(std::time::Duration::from_secs(120))
        .send()
        .await
        .map_err(|e| format!("qa request failed: {e}"))?;

    if !resp.status().is_success() {
        let body = resp.text().await.unwrap_or_default();
        let _ = app.emit(
            "ai:error",
            serde_json::json!({"chat_session_id": &chat_session_id, "error": body}),
        );
        return Err(format!("qa returned error: {body}"));
    }

    // Read the SSE stream.
    let mut stream = resp.bytes_stream();
    use futures_util::StreamExt;
    let mut buf = String::new();
    while let Some(chunk) = stream.next().await {
        let bytes = chunk.map_err(|e| e.to_string())?;
        buf.push_str(&String::from_utf8_lossy(&bytes));

        // Process complete SSE lines.
        while let Some(pos) = buf.find("\n\n") {
            let line = buf[..pos].to_string();
            buf = buf[pos + 2..].to_string();
            let data = line.strip_prefix("data: ").unwrap_or(&line);
            if let Ok(val) = serde_json::from_str::<serde_json::Value>(data) {
                match val.get("type").and_then(|t| t.as_str()) {
                    Some("token") => {
                        let _ = app.emit(
                            "ai:token",
                            serde_json::json!({
                                "chat_session_id": &chat_session_id,
                                "token": val.get("token").unwrap_or(&serde_json::Value::Null),
                            }),
                        );
                    }
                    Some("done") => {
                        let _ = app.emit(
                            "ai:done",
                            serde_json::json!({
                                "chat_session_id": &chat_session_id,
                                "answer": val.get("answer"),
                                "counterpoint": val.get("counterpoint"),
                                "followup_question": val.get("followup_question"),
                                "margin_note": val.get("margin_note"),
                                "sources": val.get("sources"),
                                "confidence": val.get("confidence"),
                            }),
                        );
                    }
                    _ => {}
                }
            }
        }
    }

    Ok(())
}
