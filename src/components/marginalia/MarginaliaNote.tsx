import {
  AlertTriangle,
  Check,
  Copy,
  Highlighter,
  Info,
  Link2,
  MessageCircle,
  Pencil,
  ShieldAlert,
  Trash2,
  X,
} from "lucide-react";
import { useState } from "react";
import { useAnnotationStore } from "../../store/annotationStore";
import { useMarginaliaStore, type MarginaliaNote, type NoteType } from "../../store/marginaliaStore";
import { cn } from "../../lib/utils";

type Props = {
  note: MarginaliaNote;
  onJumpToPage?: (page: number) => void;
};

const typeConfig: Record<NoteType, { icon: React.ReactNode; color: string; label: string }> = {
  manual: {
    icon: <Pencil className="w-3 h-3" />,
    color: "text-accent-secondary bg-accent-secondary/10",
    label: "Note",
  },
  restatement: {
    icon: <MessageCircle className="w-3 h-3" />,
    color: "text-text-secondary bg-text-secondary/10",
    label: "Restatement",
  },
  assumption: {
    icon: <AlertTriangle className="w-3 h-3" />,
    color: "text-accent-warning bg-accent-warning/10",
    label: "Assumption",
  },
  contradiction: {
    icon: <ShieldAlert className="w-3 h-3" />,
    color: "text-accent-primary bg-accent-primary/10",
    label: "Contradiction",
  },
  connection: {
    icon: <Link2 className="w-3 h-3" />,
    color: "text-blue-400 bg-blue-400/10",
    label: "Connection",
  },
  limitation: {
    icon: <Info className="w-3 h-3" />,
    color: "text-orange-400 bg-orange-400/10",
    label: "Limitation",
  },
};

export function MarginaliaNoteCard({ note, onJumpToPage }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const text = note.is_edited && note.edited_text ? note.edited_text : note.note_text;
  const [draft, setDraft] = useState(text);
  const updateNote = useMarginaliaStore((s) => s.updateNote);
  const deleteNote = useMarginaliaStore((s) => s.deleteNote);
  const promoteToAnnotation = useMarginaliaStore((s) => s.promoteToAnnotation);
  const setAnnotations = useAnnotationStore((s) => s.setAnnotations);
  const annotations = useAnnotationStore((s) => s.annotations);
  const cfg = typeConfig[note.type] || typeConfig.restatement;
  const truncated = text.length > 60 ? text.slice(0, 57) + "..." : text;

  async function saveEdit() {
    const next = draft.trim();
    if (!next) return;
    await updateNote(note.id, next);
    setEditing(false);
  }

  async function promote() {
    const annotation = await promoteToAnnotation(note.id);
    setAnnotations([...annotations, annotation]);
  }

  return (
    <div
      className={cn(
        "group flex items-start gap-1.5 px-2 py-1.5 rounded-md cursor-pointer",
        "text-xs transition-colors hover:bg-surface-overlay",
        cfg.color,
      )}
      onClick={() => setExpanded(!expanded)}
    >
      <span className="shrink-0 mt-0.5">{cfg.icon}</span>
      <div className="min-w-0 flex-1">
        {expanded ? (
          <div>
            <div className="flex items-center gap-1 mb-0.5">
              <div className="font-medium flex-1">{cfg.label}</div>
              {!editing && (
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <ActionBtn label="Edit" icon={<Pencil className="w-3 h-3" />} onClick={() => setEditing(true)} />
                  <ActionBtn label="Copy" icon={<Copy className="w-3 h-3" />} onClick={() => void navigator.clipboard.writeText(text)} />
                  <ActionBtn label="Promote to annotation" icon={<Highlighter className="w-3 h-3" />} onClick={() => void promote()} />
                  <ActionBtn label="Delete" icon={<Trash2 className="w-3 h-3" />} danger onClick={() => void deleteNote(note.id)} />
                </div>
              )}
            </div>
            {editing ? (
              <div className="space-y-1">
                <textarea
                  className="q-input w-full min-h-16 resize-y text-xs text-text-primary"
                  value={draft}
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      setDraft(text);
                      setEditing(false);
                    }
                  }}
                />
                <div className="flex justify-end gap-1">
                  <ActionBtn label="Cancel" icon={<X className="w-3 h-3" />} onClick={() => {
                    setDraft(text);
                    setEditing(false);
                  }} />
                  <ActionBtn label="Save" icon={<Check className="w-3 h-3" />} onClick={() => void saveEdit()} />
                </div>
              </div>
            ) : (
              <div className="text-text-primary">{text}</div>
            )}
            {note.ref_page && onJumpToPage && (
              <button
                className="text-accent-primary hover:underline mt-1"
                onClick={(e) => {
                  e.stopPropagation();
                  onJumpToPage(note.ref_page!);
                }}
              >
                See p.{note.ref_page}
              </button>
            )}
          </div>
        ) : (
          <span>{truncated}</span>
        )}
      </div>
    </div>
  );
}

function ActionBtn({
  icon,
  label,
  onClick,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      className={cn(
        "p-0.5 rounded hover:bg-surface-overlay transition-colors",
        danger && "hover:text-accent-error",
      )}
      title={label}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      {icon}
    </button>
  );
}
