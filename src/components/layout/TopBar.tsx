import { FlaskConical, FolderOpen, Settings2 } from "lucide-react";
import { usePdfStore } from "../../store/pdfStore";

type Props = {
  onOpen: () => void;
  onSettings?: () => void;
};

export function TopBar({ onOpen, onSettings }: Props) {
  const paper = usePdfStore((s) => s.paper);
  return (
    <header className="h-11 shrink-0 flex items-center px-3 border-b border-surface-border bg-surface-raised">
      <div className="flex items-center gap-2 pr-3 border-r border-surface-border">
        <FlaskConical className="w-4 h-4 text-accent-primary" />
        <span className="font-semibold">Queriously</span>
      </div>
      <div className="mx-3 text-text-secondary truncate">
        {paper?.title ?? "No paper open"}
      </div>
      <div className="ml-auto flex items-center gap-1">
        <button className="q-btn" onClick={onOpen} title="Open PDF">
          <FolderOpen className="w-4 h-4" />
          <span>Open</span>
        </button>
        <button
          className="q-btn"
          onClick={onSettings}
          title="Settings"
          aria-label="Settings"
        >
          <Settings2 className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
