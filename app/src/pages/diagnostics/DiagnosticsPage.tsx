import { useEffect, useMemo, useState } from "react";
import { RefreshCw, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { InfoCard } from "../../components/cards/InfoCard";
import { EventTimeline } from "../../components/runtime/EventTimeline";
import { StatusPill } from "../../components/status/StatusPill";
import { mapRecentActionsToRuntimeEvents } from "../../features/network/actionPresentation";
import {
  createDesktopCommandResult,
  desktopEngineSnapshot,
  emptyInspectSnapshot,
  isDesktopBridgeUnavailable,
} from "../../features/network/desktopPresentation";
import { buildDiagnosticsSummary } from "../../features/diagnostics/diagnosticSummary";
import {
  describeEdgeState,
  describeProcessLiveness,
  describeRouteMode,
  displayProcessId,
  displayMetric,
  summarizeNetworkQuality,
} from "../../features/network/networkSummary";
import { fetchDashboardSummary, type DashboardSummary } from "../../lib/api/dashboard";
import { fetchServerHealth, type ServerHealth } from "../../lib/api/health";
import { fetchNetworkStatus, fetchRecentActionsHistory, type NetworkStatus, type RecentAction } from "../../lib/api/network";
import { fetchRooms, type RoomItem } from "../../lib/api/rooms";
import {
  inspectNetworkBridge,
  type DesktopCommandResult,
  type InspectSnapshot,
} from "../../lib/desktop/bridge";
import { errorDetail } from "../../lib/errors";
import type { UserProfile } from "../../lib/profile/userProfile";
import { hasJoinedRoom, type ConnectionContext } from "../../lib/runtime/connectionContext";
import { useLiveRefresh } from "../../lib/runtime/useLiveRefresh";
import { resolveRuntimeEvents, type RuntimeEvent } from "../../lib/runtime/runtimeEvents";
import type { AppSettings } from "../../lib/settings/appSettings";

const emptyInspect: InspectSnapshot = {
  ...emptyInspectSnapshot,
  roomId: "--",
};

const initialInspectResult: DesktopCommandResult = createDesktopCommandResult("尚未执行本地诊断。", {
  inspect: emptyInspect,
});

type DiagnosticsPageProps = {
  profile: UserProfile;
  settings: AppSettings;
  connectionContext: ConnectionContext;
};

export function DiagnosticsPage({ profile, settings, connectionContext }: DiagnosticsPageProps) {
  const [loading, setLoading] = useState(false);
  const [serverHealth, setServerHealth] = useState<ServerHealth | null>(null);
  const [serverError, setServerError] = useState("");
  const [dashboard, setDashboard] = useState<DashboardSummary | null>(null);
  const [rooms, setRooms] = useState<RoomItem[]>([]);
  const [roomsError, setRoomsError] = useState("");
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus | null>(null);
  const [actionHistory, setActionHistory] = useState<RecentAction[]>([]);
  const [inspectResult, setInspectResult] = useState<DesktopCommandResult>(initialInspectResult);
  const [refreshedAt, setRefreshedAt] = useState("--");
  const [liveTone, setLiveTone] = useState<"online" | "warning" | "idle">("idle");
  const [liveLabel, setLiveLabel] = useState("待机");
  const [events, setEvents] = useState(() => resolveRuntimeEvents());

  const serverHealthy = serverHealth?.status === "ok";
  const inspect = desktopEngineSnapshot(inspectResult, emptyInspect);
  const desktopUnavailable = isDesktopBridgeUnavailable(inspectResult.detail);
  const activeServerBaseUrl = connectionContext.serverBaseUrl || settings.serverBaseUrl;
  const activeRoomScope = hasJoinedRoom(connectionContext) ? connectionContext.roomId : undefined;
  const currentRoom = useMemo(
    () => rooms.find((room) => room.roomId === connectionContext.roomId) ?? null,
    [rooms, connectionContext.roomId],
  );
  const currentRoomOnlineMembers = currentRoom?.memberDetails.filter((member) => member.presence === "online").length ?? 0;
  const routeQuality = useMemo(
    () => networkStatus ? summarizeNetworkQuality(networkStatus) : null,
    [networkStatus],
  );

  const diagnostics = useMemo(
    () => buildDiagnosticsSummary({
      settings,
      connectionContext,
      activeServerBaseUrl,
      rooms,
      serverHealthy,
      serverError,
      roomsError,
      inspectResult,
      networkStatus,
    }),
    [settings, connectionContext, activeServerBaseUrl, rooms, serverHealthy, serverError, roomsError, inspectResult, networkStatus],
  );
  const serverHistoryEvents = useMemo(() => mapRecentActionsToRuntimeEvents(actionHistory.slice(0, 8)), [actionHistory]);

  async function refreshDiagnostics(options?: { silent?: boolean }) {
    const silent = options?.silent ?? false;

    if (!silent) {
      setLoading(true);
    }

    const [healthResult, dashboardResult, roomsResult, networkResult, historyResult, inspectResultValue] = await Promise.allSettled([
      fetchServerHealth(activeServerBaseUrl),
      fetchDashboardSummary(activeServerBaseUrl),
      fetchRooms(activeServerBaseUrl),
      fetchNetworkStatus(activeServerBaseUrl, activeRoomScope),
      fetchRecentActionsHistory(activeServerBaseUrl, activeRoomScope),
      inspectNetworkBridge(),
    ]);

    if (healthResult.status === "fulfilled") {
      setServerHealth(healthResult.value);
      setServerError("");
    } else {
      setServerHealth(null);
      setServerError(errorDetail(healthResult.reason));
    }

    const nextServerHealthy = healthResult.status === "fulfilled" && healthResult.value.status === "ok";

    setDashboard(nextServerHealthy && dashboardResult.status === "fulfilled" ? dashboardResult.value : null);
    setNetworkStatus(nextServerHealthy && networkResult.status === "fulfilled" ? networkResult.value : null);
    setActionHistory(nextServerHealthy && historyResult.status === "fulfilled" ? historyResult.value : []);

    if (roomsResult.status === "fulfilled") {
      setRooms(roomsResult.value);
      setRoomsError("");
    } else {
      setRooms([]);
      setRoomsError(errorDetail(roomsResult.reason));
    }

    if (inspectResultValue.status === "fulfilled") {
      setInspectResult(inspectResultValue.value);
      } else {
      setInspectResult(createDesktopCommandResult(`本地检查失败：${errorDetail(inspectResultValue.reason)}`, {
        inspect: emptyInspect,
      }));
      }

    setEvents(resolveRuntimeEvents());

    if (!activeServerBaseUrl.trim()) {
      setLiveTone("idle");
      setLiveLabel("待配置");
    } else if (nextServerHealthy) {
      setLiveTone("online");
      setLiveLabel("在线");
    } else {
      setLiveTone("warning");
      setLiveLabel("异常");
    }

    setRefreshedAt(new Date().toLocaleString("zh-CN", { hour12: false }));

    if (!silent) {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refreshDiagnostics();
  }, [activeServerBaseUrl, activeRoomScope]);

  useLiveRefresh({
    enabled: true,
    intervalMs: 8000,
    runImmediately: false,
    onRefresh: async () => {
      await refreshDiagnostics({ silent: true });
    },
  });

  return (
    <div className="space-y-6">
      {/* 刷新按钮和状态 */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill tone={liveTone} text={liveLabel} />
          <span className="text-sm text-muted-foreground">刷新: {refreshedAt} · {profile.username} · {profile.machineLabel}</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void refreshDiagnostics()}
          disabled={loading}
        >
          {loading ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              刷新中...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4 mr-2" />
              刷新
            </>
          )}
        </Button>
      </div>

      {/* 状态卡片 */}
      <div className="page-grid">
        <InfoCard
          title="服务器"
          value={!activeServerBaseUrl ? "未配置" : serverHealthy ? "在线" : "不可达"}
          detail={
            !activeServerBaseUrl
              ? "先填服务器地址。"
              : serverHealthy
                ? `${serverHealth?.service ?? "vnetplay-server"} · ${activeServerBaseUrl}`
                : serverError || "健康检查失败。"
          }
          footer={<StatusPill tone={!activeServerBaseUrl || !serverHealthy ? "warning" : "online"} text={!activeServerBaseUrl ? "待配置" : serverHealthy ? "正常" : "失败"} />}
        />
        <InfoCard
          title="桌面联机引擎"
          value={desktopUnavailable ? "浏览器模式" : inspectResult.ok ? describeEdgeState(inspect.edgeState) : "待检查"}
          detail={desktopUnavailable ? "当前不在桌面壳里。" : inspectResult.detail}
          footer={<StatusPill tone={desktopUnavailable || !inspectResult.ok ? "warning" : "online"} text={desktopUnavailable ? "桥不可用" : inspectResult.ok ? "已响应" : "失败"} />}
        />
        <InfoCard
          title="房间快照"
          value={serverHealthy ? `${rooms.length} 个房间` : "待读取"}
          detail={
            serverHealthy
              ? rooms.length > 0
                ? currentRoom
                  ? `默认房间 ${settings.defaultRoomName}，当前连接 ${connectionContext.roomId}，在线 ${currentRoomOnlineMembers}/${currentRoom.members} 人`
                  : `默认房间 ${settings.defaultRoomName}，当前连接 ${connectionContext.roomId}`
                : roomsError || "服务器在线，但房间为空。"
              : roomsError || "等服务端连通。"
          }
          footer={<StatusPill tone={!serverHealthy ? "warning" : rooms.length > 0 ? "online" : "idle"} text={!serverHealthy ? "待连通" : rooms.length > 0 ? "可用" : "为空"} />}
        />
        <InfoCard
          title="状态同步"
          value={diagnostics.syncLabel}
          detail={diagnostics.syncDetail}
          footer={<StatusPill tone={diagnostics.syncTone} text={diagnostics.syncLabel} />}
        />
      </div>

      {/* 检查列表和问题列表 */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>检查项目</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {diagnostics.checks.map((item) => (
              <div key={item.label} className="flex flex-col gap-2 rounded-xl border border-border/60 bg-muted/30 p-3 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-sm font-medium">{item.label}</span>
                <StatusPill tone={item.tone} text={item.value} />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>待解决问题</CardTitle>
          </CardHeader>
          <CardContent>
            {diagnostics.issues.length > 0 ? (
              <div className="space-y-2">
                {diagnostics.issues.map((item) => (
                  <div key={`${item.title}-${item.detail}`} className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
                    <div className="mb-1 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <span className="text-sm font-medium">{item.title}</span>
                      <Badge variant="outline" className="text-xs">{item.tone === "idle" ? "可稍后" : "优先处理"}</Badge>
                    </div>
                    <p className="text-xs leading-5 text-muted-foreground">{item.detail}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <CheckCircle2 className="w-12 h-12 text-green-500 mb-3" />
                <p className="text-sm text-muted-foreground">当前无明显阻塞，可回联机页。</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 服务端和本机详情 */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>服务端详情</CardTitle>
          </CardHeader>
          <CardContent>
            {serverHealthy && dashboard && networkStatus ? (
              <>
                <div className="key-value-grid mb-4">
                  <div className="key-value-item"><span>服务</span><span>{serverHealth?.service}</span></div>
                  <div className="key-value-item"><span>活跃房间</span><span>{dashboard.activeRoom}</span></div>
                  <div className="key-value-item"><span>房间人数</span><span>{dashboard.roomMembers}</span></div>
                  <div className="key-value-item"><span>虚拟 IP</span><span>{displayMetric(networkStatus.overlayIp, "待心跳")}</span></div>
                  <div className="key-value-item"><span>延迟</span><span>{displayMetric(networkStatus.latency, "待探测")}</span></div>
                  <div className="key-value-item"><span>线路提示</span><span>{displayMetric(networkStatus.relay, "待判定")}</span></div>
                  <div className="key-value-item"><span>路由策略</span><span>{describeRouteMode(networkStatus.routeMode)}</span></div>
                  <div className="key-value-item"><span>本地网络状态</span><span>{describeEdgeState(networkStatus.edgeState)}</span></div>
                </div>
                <div className="guide-code-block text-xs">
                  {networkStatus.recentAction.detail}
                </div>
                <p className="mt-3 text-xs leading-5 text-muted-foreground">
                  这里显示的是服务端最近一次针对当前房间收到的网络质量数据；如果虚拟 IP 或延迟还是 `--`，通常代表心跳还没到达或刚刚重启。
                </p>
                {routeQuality ? (
                  <div className="mt-3 rounded-xl border border-border/60 bg-muted/30 px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">线路结论</span>
                      <StatusPill tone={routeQuality.tone} text={routeQuality.label} />
                    </div>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{routeQuality.detail}</p>
                  </div>
                ) : null}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <XCircle className="w-12 h-12 text-gray-300 mb-3" />
                <p className="text-sm text-muted-foreground">{serverError || "服务端未连通。"}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>本机详情</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="key-value-grid mb-4">
              <div className="key-value-item"><span>房间</span><span>{inspect.roomId}</span></div>
              <div className="key-value-item"><span>用户名</span><span>{inspect.username}</span></div>
              <div className="key-value-item"><span>房间群组</span><span>{inspect.community}</span></div>
              <div className="key-value-item"><span>中继节点</span><span>{inspect.supernode}</span></div>
              <div className="key-value-item"><span>本地网络状态</span><span>{describeEdgeState(inspect.edgeState)}</span></div>
              <div className="key-value-item"><span>进程存活</span><span>{describeProcessLiveness(inspect.pidAlive)}</span></div>
              <div className="key-value-item"><span>进程号</span><span>{displayProcessId(inspect.lastPid)}</span></div>
            </div>
            <div className="guide-code-block text-xs">
              {inspect.commandPreview}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 房间列表 */}
      {rooms.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>房间列表</CardTitle>
            <CardDescription>当前服务器上的房间</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
              {rooms.slice(0, 6).map((room) => {
                const connected = room.roomId === connectionContext.roomId && hasJoinedRoom(connectionContext);
                const isDefaultRoom = room.roomId === settings.defaultRoomName;
                const onlineMembers = room.memberDetails.filter((member) => member.presence === "online").length;

                return (
                  <div
                    key={room.roomId}
                    className={`room-card ${connected ? "connected" : ""}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium">{room.roomId}</span>
                      <div className="flex gap-1">
                        {room.requiresPassword ? (
                          <Badge variant="outline" className="text-xs">有密码</Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">免密码</Badge>
                        )}
                        {isDefaultRoom && <Badge className="text-xs">默认</Badge>}
                        {connected && <Badge className="text-xs bg-green-600">当前</Badge>}
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {room.members} 人 · 在线 {onlineMembers} 人 · 房主：{room.host}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 事件时间线 */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>服务端历史</CardTitle>
          </CardHeader>
          <CardContent>
            <EventTimeline events={serverHistoryEvents} emptyLabel="还没有服务端记录。" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>本地时间线</CardTitle>
          </CardHeader>
          <CardContent>
            <EventTimeline events={events.slice(0, 8)} emptyLabel="还没有运行记录。" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
