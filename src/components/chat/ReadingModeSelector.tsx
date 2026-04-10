import { GitMerge, MessageSquare, PenLine, Swords } from "lucide-react";
import { useChatStore, type ReadingMode } from "../../store/chatStore";
import { cn } from "../../lib/utils";

const modes: { id: ReadingMode; icon: React.ReactNode; label: string }[] = [
  { id: "explain", icon: <MessageSquare className="w-3.5 h-3.5" />, label: "Explain" },
  { id: "challenge", icon: <Swords className="w-3.5 h-3.5" />, label: "Challenge" },
  { id: "connect", icon: <GitMerge className="w-3.5 h-3.5" />, label: "Connect" },
  { id: "annotate", icon: <PenLine className="w-3.5 h-3.5" />, label: "Annotate" },
];

export function ReadingModeSelector() {
  const active = useChatStore((s) => s.readingMode);
  const setMode = useChatStore((s) => s.setReadingMode);

  return (
    <div className="flex items-center gap-0.5 px-2 py-1">
      {modes.map((m) => (
        <button
          key={m.id}
          onClick={() => setMode(m.id)}
          className={cn(
            "flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors",
            active === m.id
              ? "bg-accent-primary/15 text-accent-primary"
              : "text-text-secondary hover:text-text-primary hover:bg-surface-overlay",
          )}
          title={m.label}
        >
          {m.icon}
          <span>{m.label}</span>
        </button>
      ))}
    </div>
  );
}
