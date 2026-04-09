use parking_lot::Mutex;
use rusqlite::Connection;
use std::sync::Arc;

use crate::paths;

pub type DbHandle = Arc<Mutex<Connection>>;

/// Open (or create) the SQLite database and run migrations.
pub fn open() -> anyhow::Result<DbHandle> {
    paths::ensure_dirs()?;
    let conn = Connection::open(paths::db_file())?;
    conn.execute_batch(
        "PRAGMA foreign_keys = ON;
         PRAGMA journal_mode = WAL;
         PRAGMA synchronous = NORMAL;",
    )?;
    migrate(&conn)?;
    Ok(Arc::new(Mutex::new(conn)))
}

fn migrate(conn: &Connection) -> anyhow::Result<()> {
    conn.execute_batch(SCHEMA_V1)?;
    Ok(())
}

/// Full schema per spec §9. Using `IF NOT EXISTS` so migration is idempotent
/// on every launch. Bumping the schema will require a versioned migration
/// table — deferred until Phase 2.
const SCHEMA_V1: &str = r#"
CREATE TABLE IF NOT EXISTS papers (
    id              TEXT PRIMARY KEY,
    file_path       TEXT NOT NULL,
    title           TEXT,
    authors         TEXT,
    abstract        TEXT,
    year            INTEGER,
    venue           TEXT,
    doi             TEXT,
    arxiv_id        TEXT,
    page_count      INTEGER,
    date_added      INTEGER NOT NULL,
    last_opened     INTEGER,
    is_indexed      INTEGER DEFAULT 0,
    index_version   INTEGER DEFAULT 0,
    marginalia_done INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS reading_progress (
    paper_id        TEXT NOT NULL REFERENCES papers(id) ON DELETE CASCADE,
    page_number     INTEGER NOT NULL,
    time_spent_secs INTEGER DEFAULT 0,
    last_visited    INTEGER,
    PRIMARY KEY (paper_id, page_number)
);

CREATE TABLE IF NOT EXISTS sessions (
    id                TEXT PRIMARY KEY,
    name              TEXT NOT NULL,
    research_question TEXT NOT NULL,
    created_at        INTEGER NOT NULL,
    updated_at        INTEGER,
    synthesis_text    TEXT,
    synthesis_stale   INTEGER DEFAULT 0,
    synthesis_at      INTEGER
);

CREATE TABLE IF NOT EXISTS session_papers (
    session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    paper_id   TEXT NOT NULL REFERENCES papers(id) ON DELETE CASCADE,
    added_at   INTEGER NOT NULL,
    PRIMARY KEY (session_id, paper_id)
);

CREATE TABLE IF NOT EXISTS annotations (
    id            TEXT PRIMARY KEY,
    paper_id      TEXT NOT NULL REFERENCES papers(id) ON DELETE CASCADE,
    session_id    TEXT REFERENCES sessions(id) ON DELETE SET NULL,
    page          INTEGER NOT NULL,
    coords        TEXT NOT NULL,
    type          TEXT NOT NULL,
    color         TEXT,
    selected_text TEXT,
    note_text     TEXT,
    created_at    INTEGER NOT NULL,
    updated_at    INTEGER
);

CREATE TABLE IF NOT EXISTS marginalia (
    id              TEXT PRIMARY KEY,
    paper_id        TEXT NOT NULL REFERENCES papers(id) ON DELETE CASCADE,
    page            INTEGER NOT NULL,
    paragraph_index INTEGER NOT NULL,
    type            TEXT NOT NULL,
    note_text       TEXT NOT NULL,
    ref_page        INTEGER,
    is_edited       INTEGER DEFAULT 0,
    is_deleted      INTEGER DEFAULT 0,
    edited_text     TEXT,
    generated_at    INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS chat_sessions (
    id                  TEXT PRIMARY KEY,
    paper_id            TEXT REFERENCES papers(id) ON DELETE CASCADE,
    research_session_id TEXT REFERENCES sessions(id) ON DELETE SET NULL,
    created_at          INTEGER NOT NULL,
    is_multi_paper      INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS chat_messages (
    id              TEXT PRIMARY KEY,
    chat_session_id TEXT NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    role            TEXT NOT NULL,
    content         TEXT NOT NULL,
    sources         TEXT,
    reading_mode    TEXT,
    selection_text  TEXT,
    confidence      TEXT,
    created_at      INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS summaries (
    id         TEXT PRIMARY KEY,
    paper_id   TEXT NOT NULL REFERENCES papers(id) ON DELETE CASCADE,
    mode       TEXT NOT NULL,
    scope      TEXT NOT NULL,
    content    TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    is_cached  INTEGER DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_papers_last_opened ON papers(last_opened DESC);
CREATE INDEX IF NOT EXISTS idx_annotations_paper ON annotations(paper_id, page);
CREATE INDEX IF NOT EXISTS idx_marginalia_paper ON marginalia(paper_id, page);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages(chat_session_id, created_at);
"#;
