import { useEffect, useState } from "react";
import { fetchRooms, type RoomItem } from "../../lib/api/rooms";

export function RoomsPage() {
  const [rooms, setRooms] = useState<RoomItem[]>([]);

  useEffect(() => {
    fetchRooms().then(setRooms);
  }, []);

  return (
    <section className="card page-card">
      <div className="section-header">
        <h2>房间列表</h2>
        <p>优先服务杀戮尖塔 2 与 Minecraft 两类联机场景。</p>
      </div>
      <div className="table-grid">
        <div className="table-row table-head">
          <span>房间</span>
          <span>游戏</span>
          <span>模式</span>
          <span>人数</span>
          <span>房主</span>
        </div>
        {rooms.map((room) => (
          <div key={room.roomId} className="table-row">
            <span>{room.roomId}</span>
            <span>{room.game}</span>
            <span>{room.mode}</span>
            <span>{room.members}</span>
            <span>{room.host}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
