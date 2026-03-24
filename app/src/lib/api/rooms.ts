import { getJson, postJson } from "./http";

export type RoomItem = {
  roomId: string;
  game: string;
  mode: string;
  members: number;
  host: string;
  participants: string[];
  createdAt: string;
  lastActiveAt: string;
  requiresPassword: boolean;
};

export type RoomPayload = {
  roomId: string;
  username: string;
  password?: string;
  game?: string;
  mode?: string;
};

const fallbackRooms: RoomItem[] = [
  {
    roomId: "sts2-night-run",
    game: "Slay the Spire 2",
    mode: "LAN Overlay",
    members: 3,
    host: "kedaya-main",
    participants: ["kedaya-main", "kedaya-vps", "relay-preferred"],
    createdAt: "2026-03-24 10:09:00",
    lastActiveAt: "2026-03-24 10:30:00",
    requiresPassword: true,
  },
  {
    roomId: "mc-build-world",
    game: "Minecraft",
    mode: "Overlay + Direct Join",
    members: 5,
    host: "kedaya-vps",
    participants: ["kedaya-vps", "kedaya-main", "builder-01", "builder-02", "builder-03"],
    createdAt: "2026-03-24 11:28:00",
    lastActiveAt: "2026-03-24 11:53:00",
    requiresPassword: false,
  },
];

function mapRoom(item: Record<string, unknown>): RoomItem {
  return {
    roomId: String(item.room_id),
    game: String(item.game),
    mode: String(item.mode),
    members: Number(item.members),
    host: String(item.host),
    participants: Array.isArray(item.participants) ? item.participants.map((entry) => String(entry)) : [],
    createdAt: String(item.created_at ?? "--"),
    lastActiveAt: String(item.last_active_at ?? "--"),
    requiresPassword: Boolean(item.requires_password),
  };
}

export async function fetchRooms(): Promise<RoomItem[]> {
  const payload = await getJson<Array<Record<string, unknown>>>("/api/rooms");
  return payload.map(mapRoom);
}

export async function createRoom(payload: RoomPayload): Promise<RoomItem> {
  const room = await postJson<Record<string, unknown>>("/api/rooms/create", {
    room_id: payload.roomId,
    game: payload.game ?? "Minecraft",
    mode: payload.mode ?? "LAN Overlay",
    username: payload.username,
    password: payload.password?.trim() || null,
  });

  return mapRoom(room);
}

export async function joinRoom(payload: RoomPayload): Promise<RoomItem> {
  const room = await postJson<Record<string, unknown>>("/api/rooms/join", {
    room_id: payload.roomId,
    username: payload.username,
    password: payload.password?.trim() || null,
  });

  return mapRoom(room);
}

export { fallbackRooms };
