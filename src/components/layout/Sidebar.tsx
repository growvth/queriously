import { FolderKanban, Library } from "lucide-react";
import { useState } from "react";
import { cn } from "../../lib/utils";

type Section = "library" | "sessions";

type Props = {
  renderLibrary?: () => React.ReactNode;
  renderSessions?: () => React.ReactNode;
};

/**
 * Left sidebar with only shipped sections.
 */
export function Sidebar({ renderLibrary, renderSessions }: Props) {
  const [active, setActive] = useState<Section>("library");

  const tabs: { id: Section; icon: React.ReactNode; label: string }[] = [
    { id: "library", icon: <Library className="w-4 h-4" />, label: "Library" },
    ...(renderSessions
      ? [
          {
            id: "sessions" as const,
            icon: <FolderKanban className="w-4 h-4" />,
            label: "Sessions",
          },
        ]
      : []),
  ];

  return (
    <aside className="h-full flex bg-surface-raised border-r border-surface-border">
      <nav className="flex flex-col gap-1 p-2 border-r border-surface-border">
        {tabs.map((t) => (
          <button
            key={t.id}
            aria-label={t.label}
            title={t.label}
            onClick={() => setActive(t.id)}
            className={cn(
              "p-2 rounded-md hover:bg-surface-overlay transition-colors",
              active === t.id && "bg-surface-overlay text-accent-primary",
            )}
          >
            {t.icon}
          </button>
        ))}
      </nav>
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="px-3 py-2 text-xs uppercase tracking-wider text-text-muted border-b border-surface-border">
          {tabs.find((t) => t.id === active)?.label}
        </div>
        <div className="flex-1 min-h-0 overflow-auto">
          {active === "library" ? (
            renderLibrary?.() ?? <EmptyState label="No papers yet." />
          ) : active === "sessions" ? (
            renderSessions?.() ?? <EmptyState label="No sessions yet." />
          ) : (
            <EmptyState label="No content." />
          )}
        </div>
      </div>
    </aside>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="h-full flex items-center justify-center text-text-muted text-xs p-4">
      {label}
    </div>
  );
}
