import { useEffect, useMemo, useState } from "react";
import { createRoom, fetchRooms, joinRoom, type RoomItem } from "../../lib/api/rooms";
import { saveAppSettings } from "../../lib/settings/appSettings";
import type { UserProfile } from "../../lib/profile/userProfile";
import type { ConnectionContext } from "../../lib/runtime/connectionContext";
import type { AppSettings } from "../../lib/settings/appSettings";

type HomePageProps = {
  profile: UserProfile;
  settings: AppSettings;
  connectionContext: ConnectionContext;
  onUpdateConnectionContext: (context: ConnectionContext) => void;
};

function errorDetail(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function HomePage({ profile, settings, connectionContext, onUpdateConnectionContext }: HomePageProps) {
  const [serverBaseUrl, setServerBaseUrl] = useState(settings.serverBaseUrl);
  const [roomId, setRoomId] = useState(settings.defaultRoomName);
  const [roomPassword, setRoomPassword] = useState("");
  const [rooms, setRooms] = useState<RoomItem[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState("");
  const [joinPassword, setJoinPassword] = useState("");
  const [feedback, setFeedback] = useState("先填写服务器地址，再创建或加入房间。");
  const [loadingRooms, setLoadingRooms] = useState(false);

  useEffect(() => {
    setServerBaseUrl(settings.serverBaseUrl);
    setRoomId(settings.defaultRoomName);
  }, [settings.serverBaseUrl, settings.defaultRoomName]);

  const selectedRoom = useMemo(() => rooms.find((item) => item.roomId === selectedRoomId) ?? null, [rooms, selectedRoomId]);

  async function handleLoadRooms() {
    const trimmedBaseUrl = serverBaseUrl.trim();
    if (!trimmedBaseUrl) {
      setFeedback("请先填写服务器地址。");
      return;
    }

    setLoadingRooms(true);
    try {
      saveAppSettings({ serverBaseUrl: trimmedBaseUrl });
      const items = await fetchRooms();
      setRooms(items);
      setSelectedRoomId((current) => current || items[0]?.roomId || "");
      setFeedback(items.length > 0 ? "已读取服务器房间。" : "当前服务器没有房间，可以直接创建。");
    } catch (error) {
      setRooms([]);
      setSelectedRoomId("");
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

    const trimmedRoomId = roomId.trim();
    if (!trimmedRoomId) {
      setFeedback("请输入房间名。");
      return;
    }

    try {
      saveAppSettings({ serverBaseUrl: trimmedBaseUrl, defaultRoomName: trimmedRoomId });
      const room = await createRoom({
        roomId: trimmedRoomId,
        username: profile.username,
        clientId: profile.machineId,
        password: roomPassword,
        game: "Minecraft",
        mode: "LAN Overlay",
      });
      setRoomPassword("");
      setFeedback(`已创建并进入 ${room.roomId}。现在可以让朋友输入同样的服务器和房间名加入。`);
      onUpdateConnectionContext({
        roomId: room.roomId,
        username: profile.username,
        serverBaseUrl: trimmedBaseUrl,
        success: true,
        detail: `已创建并进入房间 ${room.roomId}`,
        pid: null,
        source: "manual-start",
        updatedAt: new Date().toLocaleString("zh-CN", { hour12: false }),
        runtimeDurationLabel: "idle",
      });
      await handleLoadRooms();
      setSelectedRoomId(room.roomId);
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

    const targetRoomId = selectedRoomId.trim() || roomId.trim();
    if (!targetRoomId) {
      setFeedback("请先选择房间或输入房间名。");
      return;
    }

    try {
      saveAppSettings({ serverBaseUrl: trimmedBaseUrl, defaultRoomName: targetRoomId });
      const room = await joinRoom({
        roomId: targetRoomId,
        username: profile.username,
        clientId: profile.machineId,
        password: joinPassword,
      });
      setFeedback(`已进入 ${room.roomId}，当前人数 ${room.members}。现在可以在游戏里搜索局域网房间。`);
      onUpdateConnectionContext({
        roomId: room.roomId,
        username: profile.username,
        serverBaseUrl: trimmedBaseUrl,
        success: true,
        detail: `已进入房间 ${room.roomId}`,
        pid: null,
        source: "manual-start",
        updatedAt: new Date().toLocaleString("zh-CN", { hour12: false }),
        runtimeDurationLabel: "idle",
      });
      await handleLoadRooms();
      setSelectedRoomId(room.roomId);
    } catch (error) {
      setFeedback(`进入房间失败：${errorDetail(error)}`);
    }
  }

  return (
    <div className="launcher-home compact-room-workspace">
      <section className="card launcher-hero compact-hero">
        <div>
          <div className="eyebrow">好朋友联机工具</div>
          <h2>服务器、房间、加入，全部放在这一页</h2>
          <p>只保留联机必需操作，不再让用户在多个主页面之间切换。</p>
        </div>
        <div className="launcher-hero-meta">
          <span>当前玩家：{profile.username}</span>
          <span>当前设备：{profile.machineLabel}</span>
        </div>
      </section>

      <section className="card launcher-main-card compact-stack-card">
        <div className="section-header">
          <h2>1. 服务器</h2>
          <p>先填服务器地址，再读取已有房间或直接创建。</p>
        </div>
        <input className="settings-input" value={serverBaseUrl} onChange={(event) => setServerBaseUrl(event.target.value)} placeholder="先填写服务器地址，例如 http://127.0.0.1:9080" />
        <div className="launcher-inline-actions">
          <button className="ghost-button" type="button" onClick={handleLoadRooms}>{loadingRooms ? "读取中..." : "查看服务器房间"}</button>
        </div>
      </section>

      <section className="compact-room-grid">
        <div className="card launcher-main-card compact-stack-card">
          <div className="section-header">
            <h2>2. 新建房间</h2>
            <p>自己当房主，设置房间名后直接进入。</p>
          </div>
          <input className="settings-input" value={roomId} onChange={(event) => setRoomId(event.target.value)} placeholder="输入房间名" />
          <input className="settings-input" value={roomPassword} onChange={(event) => setRoomPassword(event.target.value)} placeholder="可选：设置房间密码" />
          <button className="launcher-action primary-button" type="button" onClick={handleCreateRoom}>新建并进入</button>
        </div>

        <div className="card launcher-main-card compact-stack-card">
          <div className="section-header">
            <h2>3. 选择并加入</h2>
            <p>先点上面的“查看服务器房间”，再选房间输入密码加入。</p>
          </div>
          <div className="room-picker-list">
            {rooms.length > 0 ? (
              rooms.map((room) => {
                const active = room.roomId === selectedRoomId;
                return (
                  <button
                    key={room.roomId}
                    type="button"
                    className={`room-picker-card ${active ? "active" : ""}`}
                    onClick={() => setSelectedRoomId(room.roomId)}
                  >
                    <span className="room-picker-title">{room.roomId}</span>
                    <span className="room-picker-meta">{room.members} 人 · {room.requiresPassword ? "需要密码" : "免密码"}</span>
                    <span className="room-picker-meta">房主：{room.host}</span>
                  </button>
                );
              })
            ) : (
              <div className="launcher-empty">还没有房间，先点“查看服务器房间”或直接创建。</div>
            )}
          </div>
          <input className="settings-input" value={joinPassword} onChange={(event) => setJoinPassword(event.target.value)} placeholder="如房间需要密码，请输入" />
          <button className="launcher-action ghost-button" type="button" onClick={handleJoinRoom}>加入房间</button>
        </div>
      </section>

      <section className="card launcher-status-card compact-status-card">
        <div className="section-header">
          <h2>4. 当前状态</h2>
          <p>当前连接和已选房间都合并在这里，避免信息分散。</p>
        </div>
        <div className="key-value-grid compact-key-value-grid">
          <div><strong>当前房间</strong><span>{connectionContext.roomId}</span></div>
          <div><strong>当前玩家</strong><span>{profile.username}</span></div>
          <div><strong>服务器地址</strong><span>{serverBaseUrl || "未填写"}</span></div>
          <div><strong>连接状态</strong><span>{connectionContext.success ? "已准备" : "未连接"}</span></div>
          <div><strong>已选房间</strong><span>{selectedRoom?.roomId || "未选择"}</span></div>
          <div><strong>房间人数</strong><span>{selectedRoom ? String(selectedRoom.members) : "--"}</span></div>
          <div><strong>密码要求</strong><span>{selectedRoom ? (selectedRoom.requiresPassword ? "需要密码" : "无需密码") : "--"}</span></div>
          <div><strong>房主</strong><span>{selectedRoom?.host || "--"}</span></div>
          <div><strong>房主设备</strong><span>{selectedRoom?.hostId || "--"}</span></div>
          <div><strong>成员</strong><span>{selectedRoom?.participants.join(" / ") || "--"}</span></div>
        </div>
        <div className="command-log card-subtle">
          <div className="command-log-label">提示</div>
          <div className="command-log-detail">{feedback}</div>
        </div>
      </section>
    </div>
  );
}
