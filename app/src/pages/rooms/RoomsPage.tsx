import { useEffect, useMemo, useState } from "react";
import { fetchNetworkStatus, type NetworkStatus } from "../../lib/api/network";
import { createRoom, fallbackRooms, fetchRooms, joinRoom, type RoomItem } from "../../lib/api/rooms";
import { saveAppSettings } from "../../lib/settings/appSettings";
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
    source: "server",
    pid: null,
  },
};

function errorDetail(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function RoomsPage({ profile, settings, connectionContext }: RoomsPageProps) {
  const [rooms, setRooms] = useState<RoomItem[]>([]);
  const [serverStatus, setServerStatus] = useState<NetworkStatus>(fallbackStatus);
  const [serverBaseUrl, setServerBaseUrl] = useState(settings.serverBaseUrl);
  const [createRoomId, setCreateRoomId] = useState(settings.defaultRoomName);
  const [createPassword, setCreatePassword] = useState("");
  const [selectedRoomId, setSelectedRoomId] = useState("");
  const [joinPassword, setJoinPassword] = useState("");
  const [feedback, setFeedback] = useState("先填写服务器地址，然后查看房间并创建或加入。");
  const [loadingRooms, setLoadingRooms] = useState(false);

  useEffect(() => {
    setServerBaseUrl(settings.serverBaseUrl);
    setCreateRoomId(settings.defaultRoomName);
  }, [settings.serverBaseUrl, settings.defaultRoomName]);

  const activeRoom = useMemo(() => rooms.find((room) => room.roomId === selectedRoomId) ?? null, [rooms, selectedRoomId]);

  async function loadRooms(baseUrl = serverBaseUrl) {
    const trimmedBaseUrl = baseUrl.trim();
    if (!trimmedBaseUrl) {
      setRooms([]);
      setSelectedRoomId("");
      setFeedback("请先填写服务器地址。");
      return;
    }

    setLoadingRooms(true);
    try {
      saveAppSettings({ serverBaseUrl: trimmedBaseUrl });
      const [items, status] = await Promise.all([fetchRooms(), fetchNetworkStatus()]);
      setRooms(items);
      setServerStatus(status);
      setSelectedRoomId((current) => current || items[0]?.roomId || "");
      setFeedback(items.length > 0 ? "已加载服务器房间列表。" : "当前服务器还没有房间，可以直接创建。");
    } catch (error) {
      setRooms(fallbackRooms);
      setSelectedRoomId(fallbackRooms[0]?.roomId ?? "");
      setFeedback(`读取服务器房间失败：${errorDetail(error)}`);
    } finally {
      setLoadingRooms(false);
    }
  }

  async function handleCreateRoom() {
    const trimmedBaseUrl = serverBaseUrl.trim();
    if (!trimmedBaseUrl) {
      setFeedback("请先填写服务器地址，再创建房间。");
      return;
    }

    const roomId = createRoomId.trim();
    if (!roomId) {
      setFeedback("请输入房间名后再创建。");
      return;
    }

    try {
      saveAppSettings({ serverBaseUrl: trimmedBaseUrl, defaultRoomName: roomId });
      const room = await createRoom({
        roomId,
        username: profile.username,
        clientId: profile.machineId,
        password: createPassword,
        game: "Minecraft",
        mode: "LAN Overlay",
      });
      await loadRooms(trimmedBaseUrl);
      setSelectedRoomId(room.roomId);
      setCreatePassword("");
      setFeedback(`已创建并进入房间 ${room.roomId}。${room.requiresPassword ? " 该房间需要密码进入。" : ""}`);
    } catch (error) {
      setFeedback(`创建房间失败：${errorDetail(error)}`);
    }
  }

  async function handleJoinRoom() {
    const trimmedBaseUrl = serverBaseUrl.trim();
    if (!trimmedBaseUrl) {
      setFeedback("请先填写服务器地址，再加入房间。");
      return;
    }

    const roomId = selectedRoomId.trim();
    if (!roomId) {
      setFeedback("请先选择一个房间再加入。");
      return;
    }

    try {
      saveAppSettings({ serverBaseUrl: trimmedBaseUrl });
      const room = await joinRoom({
        roomId,
        username: profile.username,
        clientId: profile.machineId,
        password: joinPassword,
      });
      await loadRooms(trimmedBaseUrl);
      setSelectedRoomId(room.roomId);
      setFeedback(`已进入房间 ${room.roomId}，当前人数 ${room.members}。`);
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
        <h2>创建或进入房间</h2>
        <p>先填写服务器地址，再查看该服务器已有房间。选中房间后可看到人数、是否需要密码，并直接进入查看当前房间状态。</p>
      </div>

      <div className="card-subtle settings-block">
        <label className="settings-label" htmlFor="room-server-base-url">服务器地址</label>
        <input
          id="room-server-base-url"
          className="settings-input"
          value={serverBaseUrl}
          onChange={(event) => setServerBaseUrl(event.target.value)}
          placeholder="例如 http://127.0.0.1:9080"
        />
        <div className="network-actions settings-actions">
          <button className="primary-button" type="button" onClick={() => loadRooms(serverBaseUrl)}>
            {loadingRooms ? "读取中..." : "查看服务器房间"}
          </button>
        </div>
      </div>

      <div className="rooms-actions-grid">
        <div className="card-subtle settings-block">
          <div className="settings-label">创建房间</div>
          <input className="settings-input" value={createRoomId} onChange={(event) => setCreateRoomId(event.target.value)} placeholder="输入新房间名" />
          <input className="settings-input" value={createPassword} onChange={(event) => setCreatePassword(event.target.value)} placeholder="可选：设置房间密码" />
          <button className="primary-button" type="button" onClick={handleCreateRoom}>创建并进入</button>
        </div>

        <div className="card-subtle settings-block">
          <div className="settings-label">进入房间</div>
          <select className="settings-input" value={selectedRoomId} onChange={(event) => setSelectedRoomId(event.target.value)}>
            <option value="">请选择房间</option>
            {rooms.map((room) => (
              <option key={room.roomId} value={room.roomId}>
                {room.roomId} · {room.members}人 · {room.requiresPassword ? "需要密码" : "免密码"}
              </option>
            ))}
          </select>
          <input className="settings-input" value={joinPassword} onChange={(event) => setJoinPassword(event.target.value)} placeholder="如房间需要密码，请输入" />
          <button className="ghost-button" type="button" onClick={handleJoinRoom}>输入密码并进入</button>
        </div>
      </div>

      <div className="command-log card-subtle">
        <div className="command-log-label">当前提示</div>
        <div className="command-log-detail">{feedback}</div>
      </div>

      <div className="table-grid">
        <div className="table-row table-head room-table-row room-table-row-extended">
          <span>房间</span>
          <span>游戏</span>
          <span>模式</span>
          <span>人数</span>
          <span>密码</span>
          <span>房主</span>
          <span>最近活跃</span>
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
              <span>{room.requiresPassword ? "需要" : "无"}</span>
              <span>{room.host}</span>
              <span>{room.lastActiveAt}</span>
            </div>
          );
        })}
      </div>

      {activeRoom ? (
        <div className="card-subtle settings-block">
          <div className="settings-label">当前房间状态</div>
          <div className="settings-value">{activeRoom.roomId}</div>
          <div className="settings-meta">当前玩家：{profile.username}</div>
          <div className="settings-meta">人数：{activeRoom.members}</div>
          <div className="settings-meta">密码：{activeRoom.requiresPassword ? "需要密码" : "无需密码"}</div>
          <div className="settings-meta">成员：{activeRoom.participants.join(" / ") || "--"}</div>
          <div className="settings-meta">最近活跃：{activeRoom.lastActiveAt}</div>
          <div className="settings-meta">服务端最近动作：{serverStatus.recentAction.action} · {serverStatus.recentAction.updatedAt}</div>
        </div>
      ) : null}
    </section>
  );
}
