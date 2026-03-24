import { getApiBaseUrl } from "../settings/appSettings";

export type RoomItem = {
  roomId: string;
  game: string;
  mode: string;
  members: number;
  host: string;
  participants: string[];
};

export type RoomPayload = {
  roomId: string;
  username: string;
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
  },
  {
    roomId: "mc-build-world",
    game: "Minecraft",
    mode: "Overlay + Direct Join",
    members: 5,
    host: "kedaya-vps",
    participants: ["kedaya-vps", "kedaya-main", "builder-01", "builder-02", "builder-03"],
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
  };
}

export async function fetchRooms(): Promise<RoomItem[]> {
  try {
    const response = await fetch(`${getApiBaseUrl()}/api/rooms`);
    if (!response.ok) {
      return fallbackRooms;
    }

    const payload = (await response.json()) as Array<Record<string, unknown>>;
    return payload.map(mapRoom);
  } catch {
    return fallbackRooms;
  }
}

export async function createRoom(payload: RoomPayload): Promise<RoomItem> {
  const response = await fetch(`${getApiBaseUrl()}/api/rooms/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      room_id: payload.roomId,
      game: payload.game ?? "Minecraft",
      mode: payload.mode ?? "LAN Overlay",
      username: payload.username,
    }),
  });

  if (!response.ok) {
    throw new Error("create room failed");
  }

  return mapRoom((await response.json()) as Record<string, unknown>);
}

export async function joinRoom(payload: RoomPayload): Promise<RoomItem> {
  const response = await fetch(`${getApiBaseUrl()}/api/rooms/join`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      room_id: payload.roomId,
      username: payload.username,
    }),
  });

  if (!response.ok) {
    throw new Error("join room failed");
  }

  return mapRoom((await response.json()) as Record<string, unknown>);
}
