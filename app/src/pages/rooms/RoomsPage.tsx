import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Users,
  Server,
  Gamepad2,
  Share2,
  Crown,
  Copy,
  Check,
  Globe,
  Link2,
  ArrowLeft,
  RefreshCw,
  Shield,
} from "lucide-react";
import type { UserProfile } from "../../lib/profile/userProfile";
import { fetchRooms, leaveRoom, type RoomItem } from "../../lib/api/rooms";
import { hasJoinedRoom, type ConnectionContext } from "../../lib/runtime/connectionContext";
import { useLiveRefresh } from "../../lib/runtime/useLiveRefresh";
import type { AppSettings } from "../../lib/settings/appSettings";

type RoomsPageProps = {
  profile: UserProfile;
  settings: AppSettings;
  connectionContext: ConnectionContext;
  onOpenPage: (key: string) => void;
  onRequestNetworkStart?: (input: { roomId: string; serverBaseUrl: string; mode: "resume" }) => void;
  onUpdateConnectionContext: (context: ConnectionContext) => void;
};

type RoomMember = {
  id: string;
  name: string;
  isHost: boolean;
  isCurrentUser: boolean;
  avatar: string | null;
  detail: string;
};

function buildFallbackRoom(connectionContext: ConnectionContext, profile: UserProfile): RoomItem {
  return {
    roomId: connectionContext.roomId,
    game: "Unknown",
    mode: connectionContext.success ? "Network Active" : "Room Joined",
    members: 1,
    host: profile.username,
    hostId: profile.machineId,
    participants: [profile.username],
    participantIds: [profile.machineId],
    createdAt: "--",
    lastActiveAt: connectionContext.updatedAt,
    requiresPassword: false,
  };
}

function errorDetail(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function buildMembers(room: RoomItem, profile: UserProfile): RoomMember[] {
  const total = Math.max(room.participants.length, room.participantIds.length, 1);

  return Array.from({ length: total }, (_, index) => {
    const name = room.participants[index] ?? room.host;
    const id = room.participantIds[index] ?? `${room.hostId}-${index}`;
    const isCurrentUser = id === profile.machineId || name === profile.username;

    return {
      id,
      name,
      isHost: id === room.hostId || name === room.host,
      isCurrentUser,
      avatar: isCurrentUser ? profile.qqAvatar ?? null : null,
      detail: isCurrentUser ? "当前设备" : id,
    };
  }).sort((left, right) => {
    if (left.isHost !== right.isHost) {
      return left.isHost ? -1 : 1;
    }

    if (left.isCurrentUser !== right.isCurrentUser) {
      return left.isCurrentUser ? -1 : 1;
    }

    return left.name.localeCompare(right.name, "zh-CN");
  });
}

export function RoomsPage({
  profile,
  settings,
  connectionContext,
  onOpenPage,
  onRequestNetworkStart,
  onUpdateConnectionContext,
}: RoomsPageProps) {
  const [copiedRoomId, setCopiedRoomId] = useState(false);
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [room, setRoom] = useState<RoomItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");

  const isInRoom = hasJoinedRoom(connectionContext);
  const serverBaseUrl = connectionContext.serverBaseUrl || settings.serverBaseUrl;
  const fallbackRoom = useMemo(() => buildFallbackRoom(connectionContext, profile), [connectionContext, profile]);
  const activeRoom = room ?? fallbackRoom;
  const members = useMemo(() => buildMembers(activeRoom, profile), [activeRoom, profile]);

  async function loadCurrentRoom(options?: { silent?: boolean }) {
    const silent = options?.silent ?? false;

    if (!isInRoom || !serverBaseUrl.trim()) {
      return;
    }

    setLoading(true);

    try {
      const items = await fetchRooms(serverBaseUrl);
      const matchedRoom = items.find((item) => item.roomId === connectionContext.roomId) ?? null;

      setRoom(matchedRoom);
      setLoadError(matchedRoom ? "" : "服务端当前未返回该房间，已显示本地缓存信息。");
    } catch (error) {
      const detail = errorDetail(error);
      setLoadError(detail);

      if (!silent) {
        toast.error(`读取房间信息失败：${detail}`);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!isInRoom) {
      setRoom(null);
      setLoadError("");
      return;
    }

    void loadCurrentRoom({ silent: true });
  }, [isInRoom, serverBaseUrl, connectionContext.roomId]);

  useLiveRefresh({
    enabled: isInRoom && serverBaseUrl.trim().length > 0,
    intervalMs: 5000,
    onRefresh: async () => {
      await loadCurrentRoom({ silent: true });
    },
  });

  const handleCopyRoomId = async () => {
    if (!activeRoom.roomId) {
      return;
    }

    await navigator.clipboard.writeText(activeRoom.roomId);
    setCopiedRoomId(true);
    window.setTimeout(() => setCopiedRoomId(false), 2000);
  };

  const handleCopyInvite = async () => {
    const inviteText = [`服务器: ${serverBaseUrl || "未配置"}`, `房间: ${activeRoom.roomId}`].join("\n");
    await navigator.clipboard.writeText(inviteText);
    setCopiedInvite(true);
    toast.success("邀请信息已复制");
    window.setTimeout(() => setCopiedInvite(false), 2000);
  };

  const handleLeaveRoom = async () => {
    let syncWarning = "";

    if (serverBaseUrl.trim()) {
      try {
        const result = await leaveRoom({
          baseUrl: serverBaseUrl,
          roomId: activeRoom.roomId,
          username: profile.username,
          clientId: profile.machineId,
        });

        if (!result.removedClient) {
          syncWarning = result.roomExists
            ? "服务端未找到当前设备的房间记录，已仅清理本地状态。"
            : "服务端房间已不存在，已清理本地状态。";
        }
      } catch (error) {
        syncWarning = `服务端退出同步失败：${errorDetail(error)}`;
      }
    }

    onUpdateConnectionContext({
      ...connectionContext,
      joinedRoom: false,
      success: false,
      roomId: "未连接",
      detail: "已退出房间",
      pid: null,
      source: "stop",
      runtimeDurationLabel: "idle",
    });

    if (syncWarning) {
      toast.warning(syncWarning);
    } else {
      toast.success("已退出房间");
    }

    onOpenPage("home");
  };

  const handleResumeNetwork = () => {
    onRequestNetworkStart?.({
      roomId: activeRoom.roomId,
      serverBaseUrl,
      mode: "resume",
    });
  };

  if (!isInRoom) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-medium mb-2">未加入房间</h3>
          <p className="text-sm text-muted-foreground mb-4">请先创建或加入一个房间</p>
          <Button onClick={() => onOpenPage("home")}>返回首页</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Link2 className="w-5 h-5" />
                {activeRoom.roomId}
              </CardTitle>
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <span>{activeRoom.game}</span>
                <span>·</span>
                <span>{activeRoom.mode}</span>
                {activeRoom.requiresPassword && (
                  <Badge variant="outline" className="gap-1">
                    <Shield className="w-3 h-3" />
                    有密码
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleCopyRoomId}>
                {copiedRoomId ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copiedRoomId ? "已复制" : "复制房间号"}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => void handleLeaveRoom()} className="text-muted-foreground">
                <ArrowLeft className="w-4 h-4 mr-1" />
                退出
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="p-3 rounded-lg bg-muted/50 text-center">
              <Users className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
              <p className="text-sm font-medium">{members.length} 人在线</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 text-center">
              <Server className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
              <p className="text-sm font-medium">{settings.supernodeAddress || "默认节点"}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 text-center">
              <Globe className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
              <p className="text-sm font-medium">{connectionContext.success ? "网络已启动" : "房间已加入"}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 text-center">
              <RefreshCw className={`w-4 h-4 mx-auto mb-1 text-muted-foreground ${loading ? "animate-spin" : ""}`} />
              <p className="text-sm font-medium">{activeRoom.lastActiveAt || "--"}</p>
            </div>
          </div>

          {loadError ? (
            <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 px-3 py-2 text-sm text-muted-foreground">
              {loadError}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-base">房间成员</CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{members.length} 人</Badge>
              <Button variant="outline" size="sm" onClick={() => void loadCurrentRoom()} disabled={loading}>
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                刷新
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {members.map((member) => (
              <div key={member.id} className="flex items-center gap-3 p-3 rounded-lg border border-border/60 bg-muted/20">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={member.avatar ?? undefined} alt={member.name} />
                  <AvatarFallback className="bg-primary/10 text-primary text-sm">
                    {member.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium truncate">{member.name}</span>
                    {member.isHost ? (
                      <Badge className="text-xs bg-yellow-500 hover:bg-yellow-600">
                        <Crown className="w-3 h-3 mr-1" />
                        房主
                      </Badge>
                    ) : null}
                    {member.isCurrentUser ? <Badge variant="outline">本机</Badge> : null}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{member.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Button size="lg" className="h-14 bg-green-600 hover:bg-green-700" onClick={handleResumeNetwork}>
          <Gamepad2 className="w-5 h-5 mr-2" />
          {connectionContext.success ? "重新检查网络" : "继续联机"}
        </Button>
        <Button size="lg" variant="outline" className="h-14" onClick={handleCopyInvite}>
          {copiedInvite ? <Check className="w-5 h-5 mr-2" /> : <Share2 className="w-5 h-5 mr-2" />}
          {copiedInvite ? "已复制邀请" : "邀请好友"}
        </Button>
      </div>
    </div>
  );
}
