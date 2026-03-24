export type RuntimeEventTone = "online" | "warning" | "idle";

export type RuntimeEventScope = "room" | "network" | "server" | "diagnostics";

export type RuntimeEvent = {
  id: string;
  scope: RuntimeEventScope;
  title: string;
  detail: string;
  tone: RuntimeEventTone;
  roomId: string;
  source: string;
  createdAt: string;
  createdAtMs: number;
};

export type RuntimeEventInput = {
  scope: RuntimeEventScope;
  title: string;
  detail: string;
  tone: RuntimeEventTone;
  roomId?: string;
  source: string;
};

const storageKey = "vnetplay.runtime.event-log";
const maxEvents = 60;

function defaultEvents(): RuntimeEvent[] {
  return [];
}

export function resolveRuntimeEvents(): RuntimeEvent[] {
  if (typeof window === "undefined") {
    return defaultEvents();
  }

  const raw = window.localStorage.getItem(storageKey);
  if (!raw) {
    return defaultEvents();
  }

  try {
    const parsed = JSON.parse(raw) as RuntimeEvent[];
    return Array.isArray(parsed) ? parsed : defaultEvents();
  } catch {
    return defaultEvents();
  }
}

function saveRuntimeEvents(events: RuntimeEvent[]): RuntimeEvent[] {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(storageKey, JSON.stringify(events));
  }

  return events;
}

export function appendRuntimeEvent(input: RuntimeEventInput): RuntimeEvent[] {
  const current = resolveRuntimeEvents();
  const nowMs = Date.now();
  const last = current[0];

  if (
    last
    && nowMs - last.createdAtMs < 3000
    && last.scope === input.scope
    && last.title === input.title
    && last.detail === input.detail
    && last.source === input.source
    && last.roomId === (input.roomId ?? "--")
  ) {
    return current;
  }

  const nextEvent: RuntimeEvent = {
    id: `${nowMs}-${Math.random().toString(16).slice(2, 8)}`,
    scope: input.scope,
    title: input.title,
    detail: input.detail,
    tone: input.tone,
    roomId: input.roomId ?? "--",
    source: input.source,
    createdAt: new Date(nowMs).toLocaleString("zh-CN", { hour12: false }),
    createdAtMs: nowMs,
  };

  return saveRuntimeEvents([nextEvent, ...current].slice(0, maxEvents));
}

export function clearRuntimeEvents(): RuntimeEvent[] {
  return saveRuntimeEvents([]);
}
