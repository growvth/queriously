import {
  Copy,
  Highlighter,
  MessageSquare,
  FileText,
  Sigma,
  NotebookPen,
} from "lucide-react";
import { usePdfStore } from "../../store/pdfStore";
import { useChat } from "../../hooks/useChat";

/**
 * Appears near a text selection in the PDF viewer with quick AI actions.
 * Spec §7.4 — 6 buttons: Ask, Summarize, Extract, Highlight, Margin note, Copy.
 * Phase 1 ships Ask + Copy; others are wired as stubs.
 */
export function FloatingToolbar() {
  const selection = usePdfStore((s) => s.selection);
  const setSelection = usePdfStore((s) => s.setSelection);
  const { send } = useChat();

  if (!selection || !selection.rect) return null;

  const { text, rect } = selection;

  // Position 8px above the selection (spec §11).
  const top = rect.top - 44;
  const left = rect.left + rect.width / 2;

  function dismiss() {
    setSelection(null);
  }

  function askAbout() {
    send(`Explain the following passage:\n\n> ${text}`, text);
    dismiss();
  }

  function copyText() {
    navigator.clipboard.writeText(text);
    dismiss();
  }

  return (
    <div
      className="fixed z-50 flex items-center gap-0.5 px-1.5 py-1
                 bg-surface-raised border border-surface-border rounded-lg
                 shadow-lg animate-in fade-in"
      style={{ top, left, transform: "translateX(-50%)" }}
    >
      <ToolBtn icon={<MessageSquare className="w-4 h-4" />} label="Ask about this" onClick={askAbout} />
      <ToolBtn icon={<FileText className="w-4 h-4" />} label="Summarize" onClick={dismiss} />
      <ToolBtn icon={<Sigma className="w-4 h-4" />} label="Extract equation" onClick={dismiss} />
      <ToolBtn icon={<Highlighter className="w-4 h-4" />} label="Highlight" onClick={dismiss} />
      <ToolBtn icon={<NotebookPen className="w-4 h-4" />} label="Add margin note" onClick={dismiss} />
      <ToolBtn icon={<Copy className="w-4 h-4" />} label="Copy" onClick={copyText} />
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
