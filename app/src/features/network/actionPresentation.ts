import type { RecentAction } from "../../lib/api/network";
import type { RuntimeEvent } from "../../lib/runtime/runtimeEvents";
import { describeActionName, describeActionSource } from "./networkSummary";

export function formatRecentActionTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("zh-CN", { hour12: false });
}

export function mapRecentActionsToRuntimeEvents(actions: RecentAction[]): RuntimeEvent[] {
  return actions.map((action, index) => {
    const createdAtMs = Date.parse(action.updatedAt);

    return {
      id: `${action.updatedAt}-${action.action}-${action.roomId}-${index}`,
      scope: "server" as const,
      title: describeActionName(action.action),
      detail: action.detail,
      tone: action.action === "idle" ? "idle" : action.success ? "online" : "warning",
      roomId: action.roomId,
      source: describeActionSource(action.source),
      createdAt: formatRecentActionTime(action.updatedAt),
      createdAtMs: Number.isNaN(createdAtMs) ? 0 : createdAtMs,
    };
  });
}
