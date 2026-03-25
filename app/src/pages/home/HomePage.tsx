import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Users, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { createRoom, fetchRooms, joinRoom, type RoomItem } from "../../lib/api/rooms";
import { appendRuntimeEvent } from "../../lib/runtime/runtimeEvents";
import type { UserProfile } from "../../lib/profile/userProfile";
import type { ConnectionContext } from "../../lib/runtime/connectionContext";
import { useLiveRefresh } from "../../lib/runtime/useLiveRefresh";
import type { AppSettings } from "../../lib/settings/appSettings";

type HomePageProps = {
  profile: UserProfile;
  settings: AppSettings;
  connectionContext: ConnectionContext;
  onUpdateConnectionContext: (context: ConnectionContext) => void;
  onSaveSettings: (input: Partial<AppSettings>) => void;
  onOpenPage: (key: string) => void;
  onRequestNetworkStart: (input: { roomId: string; serverBaseUrl: string; mode: "resume" }) => void;
};

function errorDetail(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function HomePage({
  profile,
  settings,
  onUpdateConnectionContext,
  onSaveSettings,
  onOpenPage,
}: HomePageProps) {
  const [serverBaseUrl, setServerBaseUrl] = useState(settings.serverBaseUrl);
  const [roomId, setRoomId] = useState(settings.defaultRoomName);
  const [roomPassword, setRoomPassword] = useState("");
  const [rooms, setRooms] = useState<RoomItem[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState("");
  const [joinPassword, setJoinPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"create" | "join">("create");

  useEffect(() => {
    setServerBaseUrl(settings.serverBaseUrl);
    setRoomId(settings.defaultRoomName);
  }, [settings.serverBaseUrl, settings.defaultRoomName]);

  const selectedRoom = useMemo(
    () => rooms.find((item) => item.roomId === selectedRoomId) ?? null,
    [rooms, selectedRoomId]
  );

  function syncServerBaseUrl(baseUrl: string) {
    if (baseUrl !== settings.serverBaseUrl) {
      onSaveSettings({ serverBaseUrl: baseUrl });
    }
  }

  async function loadRooms(options?: { silent?: boolean }) {
    const silent = options?.silent ?? false;
    const trimmed = serverBaseUrl.trim();
    if (!trimmed) {
      if (!silent) {
        toast.error("请先填写服务器地址");
      }
      return;
    }

    syncServerBaseUrl(trimmed);
    setLoading(true);
    try {
      const items = await fetchRooms(trimmed);
      setRooms(items);
      if (items.length > 0 && !selectedRoomId) {
        setSelectedRoomId(items[0].roomId);
      }
      if (!silent) {
        toast.success(`已加载 ${items.length} 个房间`);
      }
    } catch (error) {
      console.error("Failed to load rooms:", error);
      if (!silent) {
        toast.error("加载房间列表失败：" + errorDetail(error));
      }
    } finally {
      setLoading(false);
    }
  }

  useLiveRefresh({
    enabled: serverBaseUrl.trim().length > 0,
    intervalMs: 5000,
    onRefresh: async () => {
      await loadRooms({ silent: true });
    },
  });

  async function handleCreateRoom() {
    const trimmedServer = serverBaseUrl.trim();
    const trimmedRoom = roomId.trim();
    
    if (!trimmedServer) {
      toast.error("请先填写服务器地址");
      return;
    }
    if (!trimmedRoom) {
      toast.error("请输入房间名");
      return;
    }

    syncServerBaseUrl(trimmedServer);

    try {
      const room = await createRoom({
        baseUrl: trimmedServer,
        roomId: trimmedRoom,
        username: profile.username,
        clientId: profile.machineId,
        password: roomPassword,
        game: "Minecraft",
        mode: "LAN Overlay",
      });
      
      appendRuntimeEvent({
        scope: "room",
        title: "已开房",
        detail: room.roomId,
        tone: "online",
        roomId: room.roomId,
        source: "home-create",
      });
      
      toast.success(`房间 ${room.roomId} 创建成功`);
      
      onSaveSettings({ serverBaseUrl: trimmedServer, defaultRoomName: trimmedRoom });

      onUpdateConnectionContext({
        joinedRoom: true,
        roomId: room.roomId,
        username: profile.username,
        serverBaseUrl: trimmedServer,
        success: false,
        detail: `已创建房间 ${room.roomId}`,
        pid: null,
        source: "manual-start",
        updatedAt: new Date().toLocaleString("zh-CN", { hour12: false }),
        runtimeDurationLabel: "idle",
      });

      setRoomPassword("");
      onOpenPage("rooms");
    } catch (error) {
      appendRuntimeEvent({
        scope: "room",
        title: "开房失败",
        detail: errorDetail(error),
        tone: "warning",
        roomId: trimmedRoom,
        source: "home-create",
      });
      toast.error("创建房间失败：" + errorDetail(error));
    }
  }

  async function handleJoinRoom() {
    const trimmedServer = serverBaseUrl.trim();
    const targetRoomId = selectedRoomId.trim() || roomId.trim();
    
    if (!trimmedServer) {
      toast.error("请先填写服务器地址");
      return;
    }
    if (!targetRoomId) {
      toast.error("请选择或输入房间名");
      return;
    }

    syncServerBaseUrl(trimmedServer);

    try {
      const room = await joinRoom({
        baseUrl: trimmedServer,
        roomId: targetRoomId,
        username: profile.username,
        clientId: profile.machineId,
        password: joinPassword,
      });
      
      appendRuntimeEvent({
        scope: "room",
        title: "已进房",
        detail: `${room.roomId} · ${room.members}人`,
        tone: "online",
        roomId: room.roomId,
        source: "home-join",
      });
      
      toast.success(`已加入房间 ${room.roomId}`);
      
      onSaveSettings({ serverBaseUrl: trimmedServer, defaultRoomName: targetRoomId });

      onUpdateConnectionContext({
        joinedRoom: true,
        roomId: room.roomId,
        username: profile.username,
        serverBaseUrl: trimmedServer,
        success: false,
        detail: `已进入房间 ${room.roomId}`,
        pid: null,
        source: "manual-start",
        updatedAt: new Date().toLocaleString("zh-CN", { hour12: false }),
        runtimeDurationLabel: "idle",
      });
      setJoinPassword("");
      onOpenPage("rooms");
    } catch (error) {
      appendRuntimeEvent({
        scope: "room",
        title: "加入失败",
        detail: errorDetail(error),
        tone: "warning",
        roomId: targetRoomId,
        source: "home-join",
      });
      toast.error("加入房间失败：" + errorDetail(error));
    }
  }

  return (
    <div className="space-y-6">
      {/* 服务器配置 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">服务器地址</CardTitle>
          <CardDescription>填写服务器地址以开始</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="http://127.0.0.1:9080"
              value={serverBaseUrl}
              onChange={(e) => setServerBaseUrl(e.target.value)}
              className="flex-1"
            />
            <Button onClick={() => void loadRooms()} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              读取
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 操作选项卡 */}
      <div className="flex gap-2">
        <Button
          variant={activeTab === "create" ? "default" : "outline"}
          onClick={() => setActiveTab("create")}
          className="flex-1"
        >
          <Plus className="w-4 h-4 mr-2" />
          创建房间
        </Button>
        <Button
          variant={activeTab === "join" ? "default" : "outline"}
          onClick={() => setActiveTab("join")}
          className="flex-1"
        >
          <Users className="w-4 h-4 mr-2" />
          加入房间
        </Button>
      </div>

      {/* 创建房间 */}
      {activeTab === "create" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Plus className="w-4 h-4" />
              新建房间
            </CardTitle>
            <CardDescription>创建一个新房间并成为房主</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>房间名</Label>
              <Input
                placeholder="my-room-name"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>密码（可选）</Label>
              <Input
                type="password"
                placeholder="留空表示无密码"
                value={roomPassword}
                onChange={(e) => setRoomPassword(e.target.value)}
              />
            </div>
            <Button className="w-full" onClick={handleCreateRoom}>
              创建房间
            </Button>
          </CardContent>
        </Card>
      )}

      {/* 加入房间 */}
      {activeTab === "join" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  房间列表
                </CardTitle>
                <CardDescription>选择一个房间加入</CardDescription>
              </div>
              {rooms.length > 0 && (
                <Badge variant="secondary">{rooms.length} 个房间</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 房间列表 */}
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {rooms.length > 0 ? (
                rooms.map((room) => (
                  <button
                    key={room.roomId}
                    onClick={() => setSelectedRoomId(room.roomId)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      room.roomId === selectedRoomId
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-muted/50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{room.roomId}</span>
                      <Badge variant={room.requiresPassword ? "outline" : "secondary"} className="text-xs">
                        {room.requiresPassword ? "有密码" : "免密码"}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {room.members}人 · 房主：{room.host}
                    </div>
                  </button>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">暂无房间，点击"读取"刷新</p>
                </div>
              )}
            </div>

            {/* 密码输入 */}
            {selectedRoom?.requiresPassword && (
              <div className="space-y-2">
                <Label>房间密码</Label>
                <Input
                  type="password"
                  placeholder="输入房间密码"
                  value={joinPassword}
                  onChange={(e) => setJoinPassword(e.target.value)}
                />
              </div>
            )}

            <Button
              className="w-full"
              variant="outline"
              onClick={handleJoinRoom}
              disabled={!selectedRoomId}
            >
              加入房间
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
