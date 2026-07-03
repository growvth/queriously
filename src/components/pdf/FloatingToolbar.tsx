import {
  Copy,
  Highlighter,
  MessageSquare,
  FileText,
  Sigma,
  NotebookPen,
} from "lucide-react";
import { useState } from "react";
import { useAnnotationStore } from "../../store/annotationStore";
import { usePdfStore } from "../../store/pdfStore";
import { useChat } from "../../hooks/useChat";
import { useMarginaliaStore } from "../../store/marginaliaStore";

function clamp01(v: number) {
  return Math.min(1, Math.max(0, v));
}

export function FloatingToolbar() {
  const selection = usePdfStore((s) => s.selection);
  const paper = usePdfStore((s) => s.paper);
  const setSelection = usePdfStore((s) => s.setSelection);
  const { send } = useChat();
  const addAnnotation = useAnnotationStore((s) => s.add);
  const activeColor = useAnnotationStore((s) => s.activeColor);
  const createManualNote = useMarginaliaStore((s) => s.createManualNote);
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [noteText, setNoteText] = useState("");

  if (!selection || !selection.rect) return null;

  const { page, rect } = selection;

  /** Read selected text live from the browser so we never get a stale/truncated
   *  snapshot that was captured at mouseup time via requestAnimationFrame. */
  function freshText(): string {
    const live = window.getSelection()?.toString().trim();
    return live || selection!.text;          // fall back to stored text
  }

  const top = rect.top - 44;
  const left = rect.left + rect.width / 2;

  function dismiss() {
    window.getSelection()?.removeAllRanges();
    setSelection(null);
    setIsAddingNote(false);
    setNoteText("");
  }

  function askAbout() {
    const t = freshText();
    send(`Explain the following passage:\n\n> ${t}`, t);
    dismiss();
  }

  function extractEquation() {
    const t = freshText();
    send(
      `Extract and explain the mathematical equation(s) in the following text. Format them in LaTeX notation and describe what each variable represents:\n\n> ${t}`,
      t,
    );
    dismiss();
  }

  function summarizeSelection() {
    const t = freshText();
    send(`Summarize the following passage concisely:\n\n> ${t}`, t);
    dismiss();
  }

  function highlight() {
    if (!paper) return;

    const pageEl = document.querySelector<HTMLElement>(`[data-page="${page}"]`);
    let coords: number[][] = [[0, 0, 1, 0.02]]; // fallback

    if (pageEl) {
      const pr = pageEl.getBoundingClientRect();
      // Use the toolbar-positioning rect as a single highlight region.
      coords = [[
        clamp01((rect.left - pr.left) / pr.width),
        clamp01((rect.top - pr.top) / pr.height),
        clamp01((rect.right - pr.left) / pr.width),
        clamp01((rect.bottom - pr.top) / pr.height),
      ]];
    }

    addAnnotation({
      id: crypto.randomUUID(),
      paper_id: paper.id,
      session_id: null,
      page,
      coords: JSON.stringify(coords),
      type: "highlight",
      color: activeColor,
      selected_text: freshText(),
      note_text: null,
      created_at: Math.floor(Date.now() / 1000),
      updated_at: null,
    }).catch(console.error);
    dismiss();
  }

  function copyText() {
    navigator.clipboard.writeText(freshText());
    dismiss();
  }

  async function saveMarginNote() {
    if (!paper) return;
    const text = noteText.trim();
    if (!text) return;

    const pageEl = document.querySelector<HTMLElement>(`[data-page="${page}"]`);
    let paragraphIndex = 0;
    if (pageEl) {
      const pr = pageEl.getBoundingClientRect();
      paragraphIndex = Math.max(
        0,
        Math.floor(clamp01((rect.top - pr.top) / pr.height) * 20),
      );
    }

    await createManualNote({
      paper_id: paper.id,
      page,
      paragraph_index: paragraphIndex,
      note_text: text,
      ref_page: null,
    });
    dismiss();
  }

  return (
    <div
      data-floating-toolbar
      className="fixed z-50 flex items-center gap-0.5 px-1.5 py-1
                 bg-surface-raised border border-surface-border rounded-lg
                 shadow-lg animate-in fade-in"
      style={{ top, left, transform: "translateX(-50%)" }}
      onMouseDown={(e) => e.preventDefault()}
    >
      {isAddingNote ? (
        <div className="flex items-center gap-1">
          <input
            className="q-input h-8 w-56 py-1 text-xs"
            autoFocus
            value={noteText}
            placeholder="Margin note..."
            onChange={(e) => setNoteText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void saveMarginNote();
              } else if (e.key === "Escape") {
                dismiss();
              }
            }}
          />
          <button
            className="q-btn-primary h-8 px-2 text-xs disabled:opacity-40"
            disabled={!noteText.trim()}
            onClick={() => void saveMarginNote()}
          >
            Save
          </button>
          <button className="q-btn h-8 px-2 text-xs" onClick={dismiss}>
            Cancel
          </button>
        </div>
      ) : (
        <>
          <ToolBtn icon={<MessageSquare className="w-4 h-4" />} label="Ask about this" onClick={askAbout} />
          <ToolBtn icon={<FileText className="w-4 h-4" />} label="Summarize" onClick={summarizeSelection} />
          <ToolBtn icon={<Sigma className="w-4 h-4" />} label="Extract equation" onClick={extractEquation} />
          <ToolBtn icon={<Highlighter className="w-4 h-4" />} label="Highlight" onClick={highlight} />
          <ToolBtn icon={<NotebookPen className="w-4 h-4" />} label="Add margin note" onClick={() => setIsAddingNote(true)} />
          <ToolBtn icon={<Copy className="w-4 h-4" />} label="Copy" onClick={copyText} />
        </>
      )}
    </div>
  );
}

function ToolBtn({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className="p-1.5 rounded hover:bg-surface-overlay transition-colors text-text-secondary hover:text-text-primary"
      title={label}
      aria-label={label}
      onClick={onClick}
    >
      {icon}
    </button>
  );
}
