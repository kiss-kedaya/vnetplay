import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { StatusPill } from "@/components/status/StatusPill";
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
  Loader2,
} from "lucide-react";
import type { UserProfile } from "../../lib/profile/userProfile";
import { syncRecentAction } from "../../lib/api/network";
import { fetchRooms, leaveRoom, type RoomItem } from "../../lib/api/rooms";
import { stopNetworkBridge } from "../../lib/desktop/bridge";
import { errorDetail } from "../../lib/errors";
import { hasJoinedRoom, type ConnectionContext } from "../../lib/runtime/connectionContext";
import { appendRuntimeEvent } from "../../lib/runtime/runtimeEvents";
import { useLiveRefresh } from "../../lib/runtime/useLiveRefresh";
import type { AppSettings } from "../../lib/settings/appSettings";
import { describeActionName, displayMetric } from "../../features/network/networkSummary";

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
  presence: "online" | "joined" | "recent" | "offline";
  overlayIp: string;
  latency: string;
  relay: string;
  lastAction: string;
  lastSeenAt: string;
  detail: string;
};

function buildFallbackRoom(connectionContext: ConnectionContext, profile: UserProfile): RoomItem {
  return {
    roomId: connectionContext.roomId,
    game: "Unknown",
    mode: connectionContext.success ? "本地网络已启动" : "已加入房间",
    members: 1,
    host: profile.username,
    hostId: profile.machineId,
    participants: [profile.username],
    participantIds: [profile.machineId],
    createdAt: "--",
    lastActiveAt: connectionContext.updatedAt,
    requiresPassword: false,
    memberDetails: [],
  };
}

function buildMembers(room: RoomItem, profile: UserProfile): RoomMember[] {
  const mapped = room.memberDetails.length > 0
    ? room.memberDetails.map((member) => {
        const isCurrentUser = member.clientId === profile.machineId || member.username === profile.username;
        return {
          id: member.clientId,
          name: member.username,
          isHost: member.isHost,
          isCurrentUser,
          avatar: isCurrentUser ? profile.qqAvatar ?? null : null,
          presence: member.presence,
          overlayIp: member.overlayIp,
          latency: member.latency,
          relay: member.relay,
          lastAction: member.lastAction,
          lastSeenAt: member.lastSeenAt,
          detail: member.detail,
        } satisfies RoomMember;
      })
    : Array.from({ length: Math.max(room.participants.length, room.participantIds.length, 1) }, (_, index) => {
        const name = room.participants[index] ?? room.host;
        const id = room.participantIds[index] ?? `${room.hostId}-${index}`;
        const isCurrentUser = id === profile.machineId || name === profile.username;

        return {
          id,
          name,
          isHost: id === room.hostId || name === room.host,
          isCurrentUser,
          avatar: isCurrentUser ? profile.qqAvatar ?? null : null,
          presence: isCurrentUser && room.mode.includes("Network") ? "online" : "joined",
          overlayIp: "--",
          latency: "--",
          relay: "等待实时网络数据",
          lastAction: "room-snapshot",
          lastSeenAt: room.lastActiveAt,
          detail: isCurrentUser ? "当前设备" : id,
        } satisfies RoomMember;
      });

  return mapped.sort((left, right) => {
    if (left.isHost !== right.isHost) {
      return left.isHost ? -1 : 1;
    }

    if (left.isCurrentUser !== right.isCurrentUser) {
      return left.isCurrentUser ? -1 : 1;
    }

    return left.name.localeCompare(right.name, "zh-CN");
  });
}

function presenceLabel(presence: RoomMember["presence"]): string {
  switch (presence) {
    case "online":
      return "在线";
    case "recent":
      return "最近活跃";
    case "offline":
      return "离线";
    case "joined":
    default:
      return "已进房";
  }
}

function presenceTone(presence: RoomMember["presence"]): "online" | "warning" | "idle" | "error" {
  switch (presence) {
    case "online":
      return "online";
    case "recent":
      return "warning";
    case "offline":
      return "error";
    case "joined":
    default:
      return "idle";
  }
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
  const [leaving, setLeaving] = useState(false);

  const isInRoom = hasJoinedRoom(connectionContext);
  const runtimeActive = connectionContext.success || connectionContext.pid != null;
  const serverBaseUrl = connectionContext.serverBaseUrl || settings.serverBaseUrl;
  const fallbackRoom = useMemo(() => buildFallbackRoom(connectionContext, profile), [connectionContext, profile]);
  const activeRoom = room ?? fallbackRoom;
  const members = useMemo(() => buildMembers(activeRoom, profile), [activeRoom, profile]);
  const onlineMembers = members.filter((member) => member.presence === "online").length;
  const recentMembers = members.filter((member) => member.presence === "recent").length;

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
    if (leaving) {
      return;
    }

    setLeaving(true);

    try {
      let syncWarning = "";
      let runtimeWarning = "";
      let successMessage = "已退出房间";

      if (runtimeActive) {
        const stopResult = await stopNetworkBridge();

        appendRuntimeEvent({
          scope: "network",
          title: stopResult.ok ? "离房前已停止网络" : "离房前停止失败",
          detail: stopResult.detail,
          tone: stopResult.ok ? "idle" : "warning",
          roomId: activeRoom.roomId,
          source: "desktop-room-leave",
        });

        if (serverBaseUrl.trim()) {
          try {
            await syncRecentAction({
              action: "desktop-stop-room-leave",
              roomId: activeRoom.roomId,
              username: profile.username,
              detail: stopResult.detail,
              success: stopResult.ok,
              source: "desktop-room-leave",
              pid: stopResult.pid ?? null,
            }, serverBaseUrl);
          } catch {
            // Ignore sync failures here; leave-room sync below will surface a warning if needed.
          }
        }

        if (stopResult.ok) {
          successMessage = "已停止网络并退出房间";
        } else {
          runtimeWarning = `本地网络停止失败：${stopResult.detail}`;
          successMessage = "已退出房间，本地网络可能仍在运行";
        }
      }

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
        detail: successMessage,
        pid: null,
        source: "stop",
        runtimeDurationLabel: "idle",
      });

      const warningMessage = [runtimeWarning, syncWarning].filter(Boolean).join("；");

      if (warningMessage) {
        toast.warning(warningMessage);
      } else {
        toast.success(successMessage);
      }

      onOpenPage("home");
    } finally {
      setLeaving(false);
    }
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
    <div className="mx-auto max-w-5xl space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Link2 className="w-5 h-5" />
                <span className="break-all">{activeRoom.roomId}</span>
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
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Button variant="outline" size="sm" onClick={handleCopyRoomId} className="w-full sm:w-auto">
                {copiedRoomId ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copiedRoomId ? "已复制" : "复制房间号"}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => void handleLeaveRoom()} className="w-full text-muted-foreground sm:w-auto" disabled={leaving}>
                {leaving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <ArrowLeft className="w-4 h-4 mr-1" />}
                {leaving ? "退出中" : "退出"}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="p-3 rounded-lg bg-muted/50 text-center">
              <Users className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
              <p className="text-sm font-medium">{onlineMembers}/{members.length} 在线</p>
              <p className="mt-1 text-xs text-muted-foreground">{recentMembers > 0 ? `${recentMembers} 人最近活跃` : "实时心跳优先"}</p>
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
          ) : onlineMembers === 0 ? (
            <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
              当前房间还没有成员被判定为在线。通常是刚加入房间、刚启动本地网络，或者服务端还没收到新的实时心跳。
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base">房间成员</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
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
                    <StatusPill tone={presenceTone(member.presence)} text={presenceLabel(member.presence)} />
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{member.detail}</p>
                  <div className="mt-2 grid gap-2 md:grid-cols-3">
                    <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">虚拟 IP</p>
                      <p className="mt-1 truncate text-xs font-medium text-foreground">{displayMetric(member.overlayIp, "待心跳")}</p>
                    </div>
                    <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">延迟</p>
                      <p className="mt-1 truncate text-xs font-medium text-foreground">{displayMetric(member.latency, "待探测")}</p>
                    </div>
                    <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2 md:col-span-1">
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">线路提示</p>
                      <p className="mt-1 text-xs font-medium text-foreground break-words">{displayMetric(member.relay, "等待实时网络数据")}</p>
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground truncate">动作：{describeActionName(member.lastAction)} · 最近活跃：{member.lastSeenAt}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Button size="lg" className="h-14 bg-green-600 hover:bg-green-700" onClick={handleResumeNetwork} disabled={leaving}>
          <Gamepad2 className="w-5 h-5 mr-2" />
          {connectionContext.success ? "重新检查网络" : "继续联机"}
        </Button>
        <Button size="lg" variant="outline" className="h-14" onClick={handleCopyInvite} disabled={leaving}>
          {copiedInvite ? <Check className="w-5 h-5 mr-2" /> : <Share2 className="w-5 h-5 mr-2" />}
          {copiedInvite ? "已复制邀请" : "邀请好友"}
        </Button>
      </div>
    </div>
  );
}
