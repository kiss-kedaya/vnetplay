import { Badge } from "@/components/ui/badge";
import type { RuntimeEvent } from "../../lib/runtime/runtimeEvents";

type EventTimelineProps = {
  events: RuntimeEvent[];
  emptyLabel?: string;
};

const scopeConfig: Record<string, { label: string; color: string }> = {
  room: { label: "ROOM", color: "bg-blue-100 text-blue-700" },
  network: { label: "EDGE", color: "bg-purple-100 text-purple-700" },
  server: { label: "SRV", color: "bg-green-100 text-green-700" },
  diagnostics: { label: "CHK", color: "bg-yellow-100 text-yellow-700" },
};

export function EventTimeline({ events, emptyLabel = "暂无记录" }: EventTimelineProps) {
  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-sm text-gray-500">{emptyLabel}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {events.map((event) => {
        const config = scopeConfig[event.scope] || { label: "LOG", color: "bg-gray-100 text-gray-700" };
        
        return (
          <div
            key={event.id}
            className={`event-item ${event.tone}`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Badge className={config.color}>{config.label}</Badge>
                <span className="font-medium text-gray-900">{event.title}</span>
              </div>
              <span className="text-xs text-gray-500">{event.createdAt}</span>
            </div>
            <p className="text-sm text-gray-600 mb-1">{event.detail}</p>
            <div className="flex items-center gap-2 text-xs text-gray-500">
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
