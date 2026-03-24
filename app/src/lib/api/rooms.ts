export type RoomItem = {
  roomId: string;
  game: string;
  mode: string;
  members: number;
  host: string;
};

const fallbackRooms: RoomItem[] = [
  { roomId: "sts2-night-run", game: "Slay the Spire 2", mode: "LAN Overlay", members: 3, host: "kedaya-main" },
  { roomId: "mc-build-world", game: "Minecraft", mode: "Overlay + Direct Join", members: 5, host: "kedaya-vps" },
];

export async function fetchRooms(): Promise<RoomItem[]> {
  try {
    const response = await fetch("http://127.0.0.1:9080/api/rooms");
    if (!response.ok) {
      return fallbackRooms;
    }

    const payload = (await response.json()) as Array<Record<string, unknown>>;
    return payload.map((item) => ({
      roomId: String(item.room_id),
      game: String(item.game),
      mode: String(item.mode),
      members: Number(item.members),
      host: String(item.host),
    }));
  } catch {
    return fallbackRooms;
  }
}
