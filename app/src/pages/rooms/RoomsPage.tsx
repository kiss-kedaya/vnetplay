import { useEffect, useMemo, useState } from "react";
import { fetchNetworkStatus, type NetworkStatus } from "../../lib/api/network";
import { createRoom, fetchRooms, joinRoom, type RoomItem } from "../../lib/api/rooms";
import type { UserProfile } from "../../lib/profile/userProfile";
import type { ConnectionContext } from "../../lib/runtime/connectionContext";
import type { AppSettings } from "../../lib/settings/appSettings";

type RoomsPageProps = {
  profile: UserProfile;
  settings: AppSettings;
  connectionContext: ConnectionContext;
};

const fallbackStatus: NetworkStatus = {
  overlayIp: "10.24.8.12",
  relay: "Tokyo Relay / VPS",
  routeMode: "relay-preferred",
  edgeState: "running",
  latency: "32 ms",
  community: "vnetplay-room",
  supernode: "127.0.0.1:7777",
  secretMasked: "********",
  recentAction: {
    action: "idle",
    roomId: "未连接",
    username: "player",
    detail: "尚未收到服务端侧最近动作",
    success: true,
    updatedAt: "--",
  },
};

function errorDetail(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function RoomsPage({ profile, settings, connectionContext }: RoomsPageProps) {
  const [rooms, setRooms] = useState<RoomItem[]>([]);
  const [serverStatus, setServerStatus] = useState<NetworkStatus>(fallbackStatus);
  const [createRoomId, setCreateRoomId] = useState(settings.defaultRoomName);
  const [selectedRoomId, setSelectedRoomId] = useState("");
  const [feedback, setFeedback] = useState("准备创建或加入房间。");

  useEffect(() => {
    Promise.all([fetchRooms(), fetchNetworkStatus()]).then(([items, status]) => {
      setRooms(items);
      setServerStatus(status);
      setSelectedRoomId(items[0]?.roomId ?? "");
    });
  }, [settings.serverBaseUrl]);

  useEffect(() => {
    setCreateRoomId(settings.defaultRoomName);
  }, [settings.defaultRoomName]);

  const activeRoom = useMemo(() => rooms.find((room) => room.roomId === selectedRoomId) ?? rooms[0], [rooms, selectedRoomId]);

  async function refreshRooms(nextSelectedRoomId?: string) {
    const [items, status] = await Promise.all([fetchRooms(), fetchNetworkStatus()]);
    setRooms(items);
    setServerStatus(status);
    setSelectedRoomId(nextSelectedRoomId ?? items[0]?.roomId ?? "");
  }

  async function handleCreateRoom() {
    const roomId = createRoomId.trim();
    if (!roomId) {
      setFeedback("请输入房间名后再创建。");
      return;
    }

    try {
      const room = await createRoom({
        roomId,
        username: profile.username,
        game: "Minecraft",
        mode: "LAN Overlay",
      });
      await refreshRooms(room.roomId);
      setFeedback(`已创建房间 ${room.roomId}，当前玩家 ${profile.username} 已自动加入。`);
    } catch (error) {
      setFeedback(`创建房间失败：${errorDetail(error)}`);
    }
  }

  async function handleJoinRoom() {
    const roomId = selectedRoomId.trim();
    if (!roomId) {
      setFeedback("请先选择一个房间再加入。");
      return;
    }

    try {
      const room = await joinRoom({
        roomId,
        username: profile.username,
      });
      await refreshRooms(room.roomId);
      setFeedback(`已加入房间 ${room.roomId}，当前成员 ${room.participants.join(" / ")}。`);
    } catch (error) {
      setFeedback(`加入房间失败：${errorDetail(error)}`);
    }
  }

  function resolveRoomBadge(room: RoomItem): string | null {
    if (room.roomId === connectionContext.roomId && connectionContext.success) {
      return "本地当前连接";
    }

    if (room.roomId === serverStatus.recentAction.roomId && serverStatus.recentAction.success) {
      return "服务端最近动作";
    }

    return null;
  }

  return (
    <section className="card page-card rooms-page">
      <div className="section-header">
        <h2>房间列表</h2>
        <p>当前玩家 {profile.username} 可以直接创建房间或加入现有房间，成员列表会同步记录到服务端状态。当前服务端：{settings.serverBaseUrl}</p>
      </div>

      <div className="rooms-actions-grid">
        <div className="card-subtle settings-block">
          <div className="settings-label">创建房间</div>
          <input className="settings-input" value={createRoomId} onChange={(event) => setCreateRoomId(event.target.value)} placeholder="输入新房间名" />
          <div className="settings-meta">默认来自设置页的默认房间名：{settings.defaultRoomName}</div>
          <button className="primary-button" type="button" onClick={handleCreateRoom}>创建并加入</button>
        </div>

        <div className="card-subtle settings-block">
          <div className="settings-label">加入房间</div>
          <select className="settings-input" value={selectedRoomId} onChange={(event) => setSelectedRoomId(event.target.value)}>
            {rooms.map((room) => (
              <option key={room.roomId} value={room.roomId}>{room.roomId}</option>
            ))}
          </select>
          <button className="ghost-button" type="button" onClick={handleJoinRoom}>加入已选房间</button>
        </div>
      </div>

      <div className="command-log card-subtle">
        <div className="command-log-label">操作结果</div>
        <div className="command-log-detail">{feedback}</div>
      </div>

      <div className="table-grid">
        <div className="table-row table-head room-table-row room-table-row-extended">
          <span>房间</span>
          <span>游戏</span>
          <span>模式</span>
          <span>人数</span>
          <span>房主</span>
          <span>最近活跃</span>
          <span>成员</span>
        </div>
        {rooms.map((room) => {
          const badge = resolveRoomBadge(room);
          return (
            <div key={room.roomId} className={`table-row room-table-row room-table-row-extended ${badge ? "room-row-highlight" : ""}`}>
              <span>
                <strong>{room.roomId}</strong>
                {badge ? <span className="room-badge">{badge}</span> : null}
              </span>
              <span>{room.game}</span>
              <span>{room.mode}</span>
              <span>{room.members}</span>
              <span>{room.host}</span>
              <span>{room.lastActiveAt}</span>
              <span>{room.participants.join(" / ")}</span>
            </div>
          );
        })}
      </div>

      {activeRoom ? (
        <div className="card-subtle settings-block">
          <div className="settings-label">当前选中房间</div>
          <div className="settings-value">{activeRoom.roomId}</div>
          <div className="settings-meta">创建时间：{activeRoom.createdAt}</div>
          <div className="settings-meta">最近活跃：{activeRoom.lastActiveAt}</div>
          <div className="settings-meta">成员：{activeRoom.participants.join(" / ")}</div>
          <div className="settings-meta">服务端最近动作：{serverStatus.recentAction.action} · {serverStatus.recentAction.updatedAt}</div>
        </div>
      ) : null}
    </section>
  );
}
