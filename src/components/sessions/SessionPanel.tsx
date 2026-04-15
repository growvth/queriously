import { useEffect, useMemo, useState } from "react";
import { usePdfStore } from "../../store/pdfStore";
import { useSessionStore } from "../../store/sessionStore";

export function SessionPanel() {
  const sessions = useSessionStore((s) => s.sessions);
  const loading = useSessionStore((s) => s.loading);
  const refresh = useSessionStore((s) => s.refresh);
  const createSession = useSessionStore((s) => s.createSession);
  const addPaper = useSessionStore((s) => s.addPaper);
  const currentPaper = usePdfStore((s) => s.paper);

  const [name, setName] = useState("");
  const [question, setQuestion] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const canCreate = useMemo(
    () => name.trim().length > 0 && question.trim().length > 0 && !saving,
    [name, question, saving],
  );

  async function onCreate() {
    if (!canCreate) return;
    setSaving(true);
    setError(null);
    try {
      await createSession(name.trim(), question.trim());
      setName("");
      setQuestion("");
    } catch (err) {
      setError(String(err));
    } finally {
      setSaving(false);
    }
  }

  async function onAddCurrentPaper(sessionId: string) {
    if (!currentPaper) return;
    setError(null);
    try {
      await addPaper(sessionId, currentPaper.id);
    } catch (err) {
      setError(String(err));
    }
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-2 border-b border-surface-border space-y-2">
        <input
          className="q-input w-full py-1.5 text-xs"
          placeholder="Session name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <textarea
          className="q-input w-full py-1.5 text-xs min-h-16 resize-y"
          placeholder="Research question"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />
        <button
          className="q-btn q-btn-primary w-full py-1.5 text-xs"
          disabled={!canCreate}
          onClick={onCreate}
        >
          {saving ? "Creating..." : "Create session"}
        </button>
        {error && <p className="text-[11px] text-red-400">{error}</p>}
      </div>

      <div className="flex-1 min-h-0 overflow-auto p-2 space-y-2">
        {loading && sessions.length === 0 ? (
          <p className="text-xs text-text-muted text-center py-4">Loading sessions...</p>
        ) : sessions.length === 0 ? (
          <p className="text-xs text-text-muted text-center py-4">
            No sessions yet. Create one to start grouping papers.
          </p>
        ) : (
          sessions.map((s) => (
            <article
              key={s.id}
              className="border border-surface-border rounded-md p-2 bg-surface-raised/40"
            >
              <h4 className="text-xs font-medium text-text-primary">{s.name}</h4>
              <p className="mt-1 text-[11px] text-text-secondary line-clamp-3">
                {s.research_question}
              </p>
              <div className="mt-2 flex items-center justify-between gap-2">
                <span className="text-[11px] text-text-muted">
                  {s.paper_count} paper{s.paper_count === 1 ? "" : "s"}
                </span>
                <button
                  className="q-btn py-1 px-2 text-[11px]"
                  onClick={() => onAddCurrentPaper(s.id)}
                  disabled={!currentPaper}
                  title={
                    currentPaper ? "Add current paper to this session" : "Open a paper first"
                  }
                >
                  Add current
                </button>
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
