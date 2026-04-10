import { MapPin } from "lucide-react";
import type { Source } from "../../store/chatStore";

type Props = {
  source: Source;
  onJump?: (page: number) => void;
};

export function SourceCitation({ source, onJump }: Props) {
  return (
    <button
      className="flex items-start gap-2 w-full text-left px-2.5 py-2 rounded-md
                 bg-surface-overlay/50 hover:bg-surface-overlay transition-colors
                 text-xs border border-surface-border"
      onClick={() => onJump?.(source.page)}
    >
      <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0 text-accent-primary" />
      <div className="min-w-0 flex-1">
        <div className="text-text-primary font-medium">
          p.{source.page}
          {source.section ? ` — ${source.section}` : ""}
          <span className="ml-2 text-text-muted font-normal">
            {Math.round(source.score * 100)}% match
          </span>
        </div>
        <div className="text-text-secondary mt-0.5 line-clamp-2">{source.text}</div>
      </div>
    </button>
  );
}
