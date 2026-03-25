import { Badge } from "@/components/ui/badge";
import type { RuntimeEvent } from "../../lib/runtime/runtimeEvents";

type EventTimelineProps = {
  events: RuntimeEvent[];
  emptyLabel?: string;
};

const scopeConfig: Record<string, { label: string; color: string }> = {
  room: { label: "ROOM", color: "bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-500/20" },
  network: { label: "EDGE", color: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/20" },
  server: { label: "SRV", color: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20" },
  diagnostics: { label: "CHK", color: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20" },
};

export function EventTimeline({ events, emptyLabel = "暂无记录" }: EventTimelineProps) {
  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-sm text-muted-foreground">{emptyLabel}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {events.map((event) => {
        const config = scopeConfig[event.scope] || { label: "LOG", color: "bg-muted text-muted-foreground border border-border/60" };
        
        return (
          <div
            key={event.id}
            className={`event-item ${event.tone}`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Badge className={config.color}>{config.label}</Badge>
                <span className="font-medium text-foreground">{event.title}</span>
              </div>
              <span className="text-xs text-muted-foreground">{event.createdAt}</span>
            </div>
            <p className="text-sm text-muted-foreground mb-1 leading-6">{event.detail}</p>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>{event.roomId}</span>
              <span>·</span>
              <span>{event.source}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
