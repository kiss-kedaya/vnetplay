import { useEffect, useMemo, useRef, useState } from "react";
import { Play, Square, RefreshCw } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EventTimeline } from "../../components/runtime/EventTimeline";
import { StatusPill } from "../../components/status/StatusPill";
import {
  fetchNetworkStatus,
  fetchRecentActionsHistory,
  syncRecentAction,
  type NetworkStatus,
  type RecentAction,
} from "../../lib/api/network";
import {
  inspectNetworkBridge,
  startNetworkBridge,
  stopNetworkBridge,
  type DesktopCommandResult,
  type InspectSnapshot,
} from "../../lib/desktop/bridge";
import type { UserProfile } from "../../lib/profile/userProfile";
import type { ConnectionContext } from "../../lib/runtime/connectionContext";
import { appendRuntimeEvent, resolveRuntimeEvents, type RuntimeEvent } from "../../lib/runtime/runtimeEvents";
import { useLiveRefresh } from "../../lib/runtime/useLiveRefresh";
import type { AppSettings } from "../../lib/settings/appSettings";

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

const idleInspect: InspectSnapshot = {
  roomId: "sts2-night-run",
  username: "player",
  community: "vnetplay-room",
  supernode: "127.0.0.1:7777",
  commandPreview: 'Command { std: "n2n-edge" "-c" "vnetplay-room" "-l" "127.0.0.1:7777" }',
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

const idleResult: DesktopCommandResult = {
  ok: true,
  detail: "等待执行桌面命令",
  pid: null,
  inspect: idleInspect,
};

type NetworkPageProps = {
  profile: UserProfile;
  settings: AppSettings;
  connectionContext: ConnectionContext;
  onUpdateConnectionContext: (context: ConnectionContext) => void;
  startRequest: { id: number; roomId: string; serverBaseUrl: string; mode: "resume" } | null;
  onConsumeStartRequest: (id: number) => void;
};

function edgeTone(result: DesktopCommandResult, inspect: InspectSnapshot): "online" | "warning" | "idle" {
  if (!result.ok) {
    return "warning";
  }

  return inspect.edgeState === "running" ? "online" : "idle";
}

function edgeLabel(result: DesktopCommandResult, inspect: InspectSnapshot): string {
  if (!result.ok) {
    return "异常";
  }

  return inspect.edgeState === "running" ? "在线" : "待机";
}

function compactTime(value: string): string {
  if (value === "--") {
    return value;
  }

  const parts = value.split(" ");
  return parts[parts.length - 1] ?? value;
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

export function NetworkPage({ profile, settings, connectionContext, onUpdateConnectionContext, startRequest, onConsumeStartRequest }: NetworkPageProps) {
  const [status, setStatus] = useState<NetworkStatus>(fallbackStatus);
  const [actionHistory, setActionHistory] = useState<RecentAction[]>([]);
  const [commandResult, setCommandResult] = useState<DesktopCommandResult>(idleResult);
  const [inspectResult, setInspectResult] = useState<DesktopCommandResult>(idleResult);
  const [liveUpdatedAt, setLiveUpdatedAt] = useState("--");
  const [liveTone, setLiveTone] = useState<"online" | "warning" | "idle">("idle");
  const [liveLabel, setLiveLabel] = useState("待机");
  const [events, setEvents] = useState<RuntimeEvent[]>(() => resolveRuntimeEvents());
  const autoConnectTriggeredRef = useRef(false);
  const edgeSignatureRef = useRef("");
  const serverSignatureRef = useRef("");

  const inspect = useMemo(() => inspectResult.inspect ?? commandResult.inspect ?? idleInspect, [inspectResult.inspect, commandResult.inspect]);
  const runtimeTone = edgeTone(inspectResult, inspect);
  const runtimeLabel = edgeLabel(inspectResult, inspect);
  const syncTone = status.recentAction.source.startsWith("desktop")
    ? (status.recentAction.success ? "online" : "warning")
    : "idle";
  const syncLabel = status.recentAction.source.startsWith("desktop")
    ? (status.recentAction.success ? "已回写" : "回写失败")
    : "待回写";
  const recentEvents = events.slice(0, 8);
  const serverHistoryEvents = useMemo(() => mapActionHistoryToEvents(actionHistory.slice(0, 8)), [actionHistory]);

  const stats = [
    { label: "Edge", value: runtimeLabel, meta: `PID ${inspect.lastPid ?? "n/a"}` },
    { label: "房间", value: settings.defaultRoomName, meta: profile.username },
    { label: "线路", value: status.latency, meta: status.routeMode },
    { label: "时长", value: inspect.runtimeDurationLabel, meta: liveUpdatedAt === "--" ? status.overlayIp : compactTime(liveUpdatedAt) },
  ];

  function recordEvent(input: Parameters<typeof appendRuntimeEvent>[0]) {
    setEvents(appendRuntimeEvent(input));
  }

  async function refreshStatus() {
    const nextStatus = await fetchNetworkStatus();
    setStatus(nextStatus);
    return nextStatus;
  }

  async function syncActionToServer(action: string, result: DesktopCommandResult, source: string, roomId: string) {
    try {
      const recentAction = await syncRecentAction({
        action,
        roomId,
        username: profile.username,
        detail: result.detail,
        success: result.ok,
        source,
        pid: result.pid ?? null,
      });

      setStatus((current) => ({
        ...current,
        recentAction,
      }));
    } catch {
      await refreshStatus();
    }
  }

  function syncConnectionFromInspect(result: DesktopCommandResult, source: ConnectionContext["source"]) {
    const snapshot = result.inspect ?? idleInspect;
    const running = result.ok && snapshot.edgeState === "running" && snapshot.pidAlive;
    const nextRoomId = snapshot.roomId !== "--"
      ? snapshot.roomId
      : connectionContext.roomId !== "未连接"
        ? connectionContext.roomId
        : "未连接";

    onUpdateConnectionContext({
      roomId: nextRoomId,
      username: profile.username,
      serverBaseUrl: settings.serverBaseUrl,
      success: running,
      detail: result.detail,
      pid: snapshot.pidAlive ? (result.pid ?? snapshot.lastPid ?? null) : null,
      source,
      updatedAt: new Date().toLocaleString("zh-CN", { hour12: false }),
      runtimeDurationLabel: snapshot.runtimeDurationLabel,
    });
  }

  async function refreshLiveSnapshot(source: ConnectionContext["source"] = "inspect") {
    const [nextStatus, nextInspect, nextHistory] = await Promise.all([
      fetchNetworkStatus(),
      inspectNetworkBridge(),
      fetchRecentActionsHistory(),
    ]);

    const nextSnapshot = nextInspect.inspect ?? idleInspect;
    const nextEdgeSignature = `${nextSnapshot.edgeState}:${nextSnapshot.pidAlive}:${nextSnapshot.lastPid ?? "n/a"}:${nextSnapshot.roomId}`;
    const nextServerSignature = `${nextStatus.recentAction.action}:${nextStatus.recentAction.updatedAt}:${nextStatus.recentAction.pid ?? "n/a"}:${nextStatus.recentAction.success}`;

    if (edgeSignatureRef.current && edgeSignatureRef.current !== nextEdgeSignature) {
      recordEvent({
        scope: "network",
        title: "Edge 变化",
        detail: `${nextSnapshot.edgeState} · ${nextSnapshot.pidAlive ? "alive" : "idle"}`,
        tone: nextSnapshot.edgeState === "running" && nextSnapshot.pidAlive ? "online" : "idle",
        roomId: nextSnapshot.roomId !== "--" ? nextSnapshot.roomId : settings.defaultRoomName,
        source: "poll-edge",
      });
    }

    if (serverSignatureRef.current && serverSignatureRef.current !== nextServerSignature) {
      recordEvent({
        scope: "server",
        title: "服务端动作",
        detail: `${nextStatus.recentAction.action} · ${nextStatus.recentAction.roomId}`,
        tone: nextStatus.recentAction.success ? "online" : "warning",
        roomId: nextStatus.recentAction.roomId,
        source: nextStatus.recentAction.source,
      });
    }

    edgeSignatureRef.current = nextEdgeSignature;
    serverSignatureRef.current = nextServerSignature;

    setStatus(nextStatus);
    setActionHistory(nextHistory);
    setInspectResult(nextInspect);
    setLiveTone(edgeTone(nextInspect, nextInspect.inspect ?? idleInspect));
    setLiveLabel(edgeLabel(nextInspect, nextInspect.inspect ?? idleInspect));
    setLiveUpdatedAt(new Date().toLocaleString("zh-CN", { hour12: false }));
    syncConnectionFromInspect(nextInspect, source);
  }

  useEffect(() => {
    void refreshLiveSnapshot();
  }, [settings.serverBaseUrl]);

  useLiveRefresh({
    enabled: true,
    intervalMs: 5000,
    runImmediately: false,
    onRefresh: async () => {
      await refreshLiveSnapshot();
    },
  });

  async function handleStartNetwork(trigger: "manual" | "auto" | "resume" = "manual", roomIdOverride?: string, serverBaseUrlOverride?: string) {
    autoConnectTriggeredRef.current = true;
    const targetRoomId = roomIdOverride ?? settings.defaultRoomName;
    const targetServerBaseUrl = serverBaseUrlOverride ?? settings.serverBaseUrl;
    const result = await startNetworkBridge({
      roomId: targetRoomId,
      username: profile.username,
      community: settings.defaultCommunity,
      supernode: settings.supernodeAddress,
    });

    const detail = trigger === "auto" ? `自动：${result.detail}` : trigger === "resume" ? `继续：${result.detail}` : result.detail;
    const finalResult = {
      ...result,
      detail,
    };
    const running = result.ok && (finalResult.inspect?.edgeState === "running" || finalResult.inspect == null);
    recordEvent({
      scope: "network",
      title: trigger === "auto" ? "自动启动" : trigger === "resume" ? "继续联机" : "手动启动",
      detail,
      tone: running ? "online" : "warning",
      roomId: targetRoomId,
      source: trigger === "auto" ? "desktop-auto" : trigger === "resume" ? "desktop-resume" : "desktop-manual",
    });
    setCommandResult(finalResult);
    setInspectResult(finalResult);
    await syncActionToServer(trigger === "auto" ? "desktop-auto-start" : trigger === "resume" ? "desktop-resume-start" : "desktop-start", finalResult, trigger === "auto" ? "desktop-auto" : trigger === "resume" ? "desktop-resume" : "desktop-manual", targetRoomId);
    onUpdateConnectionContext({
      roomId: targetRoomId,
      username: profile.username,
      serverBaseUrl: targetServerBaseUrl,
      success: running,
      detail,
      pid: result.pid ?? null,
      source: trigger === "auto" ? "auto-start" : trigger === "resume" ? "resume" : "manual-start",
      updatedAt: new Date().toLocaleString("zh-CN", { hour12: false }),
      runtimeDurationLabel: finalResult.inspect?.runtimeDurationLabel ?? "idle",
    });
    await refreshLiveSnapshot(trigger === "auto" ? "auto-start" : trigger === "resume" ? "resume" : "manual-start");
  }

  async function handleStopNetwork() {
    const result = await stopNetworkBridge();
    recordEvent({
      scope: "network",
      title: result.ok ? "已停止" : "停止失败",
      detail: result.detail,
      tone: result.ok ? "idle" : "warning",
      roomId: settings.defaultRoomName,
      source: "desktop-manual",
    });
    setCommandResult(result);
    setInspectResult(result);
    await syncActionToServer("desktop-stop", result, "desktop-manual", settings.defaultRoomName);
    onUpdateConnectionContext({
      roomId: settings.defaultRoomName,
      username: profile.username,
      serverBaseUrl: settings.serverBaseUrl,
      success: false,
      detail: result.detail,
      pid: result.pid ?? null,
      source: "stop",
      updatedAt: new Date().toLocaleString("zh-CN", { hour12: false }),
      runtimeDurationLabel: result.inspect?.runtimeDurationLabel ?? "idle",
    });
    await refreshLiveSnapshot("stop");
  }

  async function handleInspectNetwork() {
    const result = await inspectNetworkBridge();
    const running = result.ok && Boolean(result.inspect?.pidAlive) && result.inspect?.edgeState === "running";
    recordEvent({
      scope: "network",
      title: result.ok ? "检查完成" : "检查失败",
      detail: result.detail,
      tone: result.ok ? (running ? "online" : "idle") : "warning",
      roomId: settings.defaultRoomName,
      source: "desktop-manual",
    });
    setCommandResult(result);
    setInspectResult(result);
    await syncActionToServer("desktop-inspect", result, "desktop-manual", settings.defaultRoomName);
    onUpdateConnectionContext({
      roomId: settings.defaultRoomName,
      username: profile.username,
      serverBaseUrl: settings.serverBaseUrl,
      success: running,
      detail: result.detail,
      pid: result.inspect?.pidAlive ? (result.pid ?? null) : null,
      source: "inspect",
      updatedAt: new Date().toLocaleString("zh-CN", { hour12: false }),
      runtimeDurationLabel: result.inspect?.runtimeDurationLabel ?? "idle",
    });
    await refreshLiveSnapshot("inspect");
  }

  useEffect(() => {
    if (!settings.autoConnectOnLaunch || autoConnectTriggeredRef.current) {
      return;
    }

    autoConnectTriggeredRef.current = true;
    void handleStartNetwork("auto");
  }, [settings.autoConnectOnLaunch, settings.defaultRoomName, settings.defaultCommunity, settings.supernodeAddress, profile.username]);

  useEffect(() => {
    if (!startRequest) {
      return;
    }

    void handleStartNetwork(startRequest.mode, startRequest.roomId, startRequest.serverBaseUrl)
      .finally(() => {
        onConsumeStartRequest(startRequest.id);
      });
  }, [startRequest]);

  return (
    <div className="space-y-6">
      {/* 状态概览 */}
      <div className="grid grid-cols-4 gap-4">
        {stats.map((item) => (
          <Card key={item.label}>
            <CardContent className="pt-6">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">{item.label}</p>
              <p className="text-2xl font-semibold mb-1">{item.value}</p>
              <p className="text-sm text-gray-500">{item.meta}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 控制面板 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>控制台</CardTitle>
              <CardDescription>启动、停止、检查网络连接</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <StatusPill tone={runtimeTone} text={runtimeLabel} />
              <span className="text-sm text-gray-500">轮询 5s · {liveUpdatedAt}</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button onClick={() => handleStartNetwork("manual")}>
              <Play className="w-4 h-4 mr-2" />
              启动
            </Button>
            <Button variant="outline" onClick={handleStopNetwork}>
              <Square className="w-4 h-4 mr-2" />
              停止
            </Button>
            <Button variant="outline" onClick={handleInspectNetwork}>
              <RefreshCw className="w-4 h-4 mr-2" />
              检查
            </Button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="key-value-item">
              <span className="text-sm text-gray-500">用户</span>
              <span className="text-sm font-medium">{profile.username}</span>
            </div>
            <div className="key-value-item">
              <span className="text-sm text-gray-500">房间</span>
              <span className="text-sm font-medium">{settings.defaultRoomName}</span>
            </div>
            <div className="key-value-item">
              <span className="text-sm text-gray-500">群组</span>
              <span className="text-sm font-medium">{settings.defaultCommunity}</span>
            </div>
            <div className="key-value-item">
              <span className="text-sm text-gray-500">节点</span>
              <span className="text-sm font-medium">{settings.supernodeAddress}</span>
            </div>
            <div className="key-value-item">
              <span className="text-sm text-gray-500">自动</span>
              <span className="text-sm font-medium">{settings.autoConnectOnLaunch ? "开" : "关"}</span>
            </div>
            <div className="key-value-item">
              <span className="text-sm text-gray-500">服务端</span>
              <span className="text-sm font-medium truncate">{settings.serverBaseUrl || "未填"}</span>
            </div>
          </div>

          <div className="p-3 bg-gray-100 rounded-lg">
            <p className="text-sm text-gray-600">{commandResult.detail}</p>
            <p className="text-xs text-gray-500 mt-1">
              状态: {commandResult.ok ? "success" : "error"} | PID: {commandResult.pid ?? "n/a"} | 存活: {inspect.pidAlive ? "alive" : "idle/stale"}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 本机和服务端信息 */}
      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>本机状态</CardTitle>
              <StatusPill tone={runtimeTone} text={runtimeLabel} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="key-value-grid">
              <div className="key-value-item"><span>IP</span><span>{status.overlayIp}</span></div>
              <div className="key-value-item"><span>中继</span><span>{status.relay}</span></div>
              <div className="key-value-item"><span>模式</span><span>{status.routeMode}</span></div>
              <div className="key-value-item"><span>Edge</span><span>{inspect.edgeState}</span></div>
              <div className="key-value-item"><span>命令</span><span>{inspect.lastCommand}</span></div>
              <div className="key-value-item"><span>启动于</span><span>{inspect.runtimeStartedAt}</span></div>
              <div className="key-value-item"><span>PID</span><span>{inspect.lastPid ?? "n/a"}</span></div>
              <div className="key-value-item"><span>存活</span><span>{inspect.pidAlive ? "alive" : "idle"}</span></div>
              <div className="key-value-item"><span>时长</span><span>{inspect.runtimeDurationLabel}</span></div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>服务端状态</CardTitle>
              <StatusPill tone={syncTone} text={syncLabel} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="key-value-grid">
              <div className="key-value-item"><span>动作</span><span>{status.recentAction.action}</span></div>
              <div className="key-value-item"><span>房间</span><span>{status.recentAction.roomId}</span></div>
              <div className="key-value-item"><span>用户</span><span>{status.recentAction.username}</span></div>
              <div className="key-value-item"><span>来源</span><span>{status.recentAction.source}</span></div>
              <div className="key-value-item"><span>PID</span><span>{status.recentAction.pid ?? "n/a"}</span></div>
              <div className="key-value-item"><span>时间</span><span>{status.recentAction.updatedAt}</span></div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 事件时间线 */}
      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>服务端历史</CardTitle>
            <CardDescription>最近回写记录</CardDescription>
          </CardHeader>
          <CardContent>
            <EventTimeline events={serverHistoryEvents} emptyLabel="还没有服务端记录。" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>本地时间线</CardTitle>
            <CardDescription>最近操作记录</CardDescription>
          </CardHeader>
          <CardContent>
            <EventTimeline events={recentEvents} emptyLabel="还没有网络记录。" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
