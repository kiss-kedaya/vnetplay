import { useEffect, useMemo, useState } from "react";
import { RefreshCw, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { InfoCard } from "../../components/cards/InfoCard";
import { EventTimeline } from "../../components/runtime/EventTimeline";
import { StatusPill } from "../../components/status/StatusPill";
import { buildDiagnosticsSummary } from "../../features/diagnostics/diagnosticSummary";
import { fetchDashboardSummary, type DashboardSummary } from "../../lib/api/dashboard";
import { fetchServerHealth, type ServerHealth } from "../../lib/api/health";
import { fetchNetworkStatus, fetchRecentActionsHistory, type NetworkStatus, type RecentAction } from "../../lib/api/network";
import { fetchRooms, type RoomItem } from "../../lib/api/rooms";
import {
  inspectNetworkBridge,
  type DesktopCommandResult,
  type InspectSnapshot,
} from "../../lib/desktop/bridge";
import type { UserProfile } from "../../lib/profile/userProfile";
import type { ConnectionContext } from "../../lib/runtime/connectionContext";
import { useLiveRefresh } from "../../lib/runtime/useLiveRefresh";
import { resolveRuntimeEvents, type RuntimeEvent } from "../../lib/runtime/runtimeEvents";
import type { AppSettings } from "../../lib/settings/appSettings";

const emptyInspect: InspectSnapshot = {
  roomId: "--",
  username: "--",
  community: "--",
  supernode: "--",
  commandPreview: "尚未读取本地命令预览",
  edgeState: "idle",
  lastCommand: "idle",
  runtimeStartedAt: "--",
  lastStartedAt: "--",
  lastStoppedAt: "--",
  lastPid: null,
  pidAlive: false,
  runtimeDurationSeconds: 0,
  runtimeDurationLabel: "idle",
};

const initialInspectResult: DesktopCommandResult = {
  ok: false,
  detail: "尚未执行本地诊断。",
  pid: null,
  inspect: emptyInspect,
};

type DiagnosticsPageProps = {
  profile: UserProfile;
  settings: AppSettings;
  connectionContext: ConnectionContext;
};

function errorDetail(reason: unknown): string {
  return reason instanceof Error ? reason.message : String(reason);
}

function formatServerTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("zh-CN", { hour12: false });
}

function mapActionHistoryToEvents(actions: RecentAction[]): RuntimeEvent[] {
  return actions.map((action, index) => {
    const createdAtMs = Date.parse(action.updatedAt);
    return {
      id: `${action.updatedAt}-${action.action}-${action.roomId}-${index}`,
      scope: "server" as const,
      title: action.action,
      detail: action.detail,
      tone: action.action === "idle" ? "idle" : action.success ? "online" : "warning",
      roomId: action.roomId,
      source: action.source,
      createdAt: formatServerTime(action.updatedAt),
      createdAtMs: Number.isNaN(createdAtMs) ? 0 : createdAtMs,
    };
  });
}

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
  const inspect = inspectResult.inspect ?? emptyInspect;
  const desktopUnavailable = inspectResult.detail.toLowerCase().includes("desktop runtime unavailable");

  const diagnostics = useMemo(
    () => buildDiagnosticsSummary({
      settings,
      connectionContext,
      rooms,
      serverHealthy,
      serverError,
      roomsError,
      inspectResult,
      networkStatus,
    }),
    [settings, connectionContext, rooms, serverHealthy, serverError, roomsError, inspectResult, networkStatus],
  );
  const serverHistoryEvents = useMemo(() => mapActionHistoryToEvents(actionHistory.slice(0, 8)), [actionHistory]);

  async function refreshDiagnostics(options?: { silent?: boolean }) {
    const silent = options?.silent ?? false;

    if (!silent) {
      setLoading(true);
    }

    const [healthResult, dashboardResult, roomsResult, networkResult, historyResult, inspectResultValue] = await Promise.allSettled([
      fetchServerHealth(),
      fetchDashboardSummary(),
      fetchRooms(),
      fetchNetworkStatus(),
      fetchRecentActionsHistory(),
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
      setInspectResult({
        ...initialInspectResult,
        detail: `本地检查失败：${errorDetail(inspectResultValue.reason)}`,
      });
    }

    setEvents(resolveRuntimeEvents());

    if (!settings.serverBaseUrl.trim()) {
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
  }, [settings.serverBaseUrl]);

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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <StatusPill tone={liveTone} text={liveLabel} />
          <span className="text-sm text-gray-500">刷新: {refreshedAt} · {profile.username} · {profile.machineLabel}</span>
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
          value={!settings.serverBaseUrl ? "未配置" : serverHealthy ? "在线" : "不可达"}
          detail={
            !settings.serverBaseUrl
              ? "先填服务器地址。"
              : serverHealthy
                ? `${serverHealth?.service ?? "vnetplay-server"} · ${settings.serverBaseUrl}`
                : serverError || "健康检查失败。"
          }
          footer={<StatusPill tone={!settings.serverBaseUrl || !serverHealthy ? "warning" : "online"} text={!settings.serverBaseUrl ? "待配置" : serverHealthy ? "正常" : "失败"} />}
        />
        <InfoCard
          title="桌面 runtime"
          value={desktopUnavailable ? "浏览器模式" : inspectResult.ok ? inspect.edgeState : "待检查"}
          detail={desktopUnavailable ? "当前不在桌面壳里。" : inspectResult.detail}
          footer={<StatusPill tone={desktopUnavailable || !inspectResult.ok ? "warning" : "online"} text={desktopUnavailable ? "桥不可用" : inspectResult.ok ? "已响应" : "失败"} />}
        />
        <InfoCard
          title="房间快照"
          value={serverHealthy ? `${rooms.length} 个房间` : "待读取"}
          detail={
            serverHealthy
              ? rooms.length > 0
                ? `默认房间 ${settings.defaultRoomName}，当前连接 ${connectionContext.roomId}`
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
      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>检查项目</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {diagnostics.checks.map((item) => (
              <div key={item.label} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
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
                  <div key={`${item.title}-${item.detail}`} className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{item.title}</span>
                      <Badge variant="outline" className="text-xs">{item.tone === "idle" ? "可稍后" : "优先处理"}</Badge>
                    </div>
                    <p className="text-xs text-gray-600">{item.detail}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <CheckCircle2 className="w-12 h-12 text-green-500 mb-3" />
                <p className="text-sm text-gray-500">当前无明显阻塞，可回联机页。</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 服务端和本机详情 */}
      <div className="grid grid-cols-2 gap-6">
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
                  <div className="key-value-item"><span>Overlay IP</span><span>{networkStatus.overlayIp}</span></div>
                  <div className="key-value-item"><span>Latency</span><span>{networkStatus.latency}</span></div>
                  <div className="key-value-item"><span>edge 状态</span><span>{networkStatus.edgeState}</span></div>
                </div>
                <div className="p-3 bg-gray-900 rounded-lg text-gray-100 text-xs font-mono">
                  {networkStatus.recentAction.detail}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <XCircle className="w-12 h-12 text-gray-300 mb-3" />
                <p className="text-sm text-gray-500">{serverError || "服务端未连通。"}</p>
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
              <div className="key-value-item"><span>Community</span><span>{inspect.community}</span></div>
              <div className="key-value-item"><span>Supernode</span><span>{inspect.supernode}</span></div>
              <div className="key-value-item"><span>edge 状态</span><span>{inspect.edgeState}</span></div>
              <div className="key-value-item"><span>PID 存活</span><span>{inspect.pidAlive ? "alive" : "idle"}</span></div>
            </div>
            <div className="p-3 bg-gray-900 rounded-lg text-gray-100 text-xs font-mono">
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
            <div className="grid grid-cols-2 gap-2">
              {rooms.slice(0, 6).map((room) => {
                const connected = room.roomId === connectionContext.roomId && connectionContext.success;
                const isDefaultRoom = room.roomId === settings.defaultRoomName;

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
                    <div className="text-sm text-gray-500">
                      {room.members} 人 · 房主：{room.host}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 事件时间线 */}
      <div className="grid grid-cols-2 gap-6">
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
