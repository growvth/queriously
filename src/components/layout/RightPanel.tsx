import { FileText, MessageSquare, Quote, Sigma } from "lucide-react";
import { useState } from "react";
import { cn } from "../../lib/utils";

type Tab = "chat" | "equations" | "citations" | "summary";

/**
 * Right-hand companion panel. Phase 1 only ships the Chat tab content
 * (in step 8); the other tabs are placeholders so the layout is stable
 * as features land progressively.
 */
export function RightPanel() {
  const [tab, setTab] = useState<Tab>("chat");
  const tabs: { id: Tab; icon: React.ReactNode; label: string }[] = [
    {
      id: "chat",
      icon: <MessageSquare className="w-4 h-4" />,
      label: "Chat",
    },
    { id: "equations", icon: <Sigma className="w-4 h-4" />, label: "Math" },
    {
      id: "citations",
      icon: <Quote className="w-4 h-4" />,
      label: "Citations",
    },
    { id: "summary", icon: <FileText className="w-4 h-4" />, label: "Summary" },
  ];

  return (
    <div className="h-full flex flex-col bg-surface-raised border-l border-surface-border">
      <div className="flex items-center gap-0 border-b border-surface-border">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-2 text-xs",
              "hover:bg-surface-overlay transition-colors",
              tab === t.id
                ? "text-accent-primary border-b border-accent-primary"
                : "text-text-secondary",
            )}
          >
            {t.icon}
            <span>{t.label}</span>
          </button>
        ))}
      </div>
      <div className="flex-1 min-h-0 overflow-auto p-4 text-text-muted text-xs">
        {tab === "chat"
          ? "Chat panel coming next."
          : "Not implemented in Phase 1."}
      </div>
    </div>
  );
}
