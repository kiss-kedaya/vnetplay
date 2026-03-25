import { useEffect, useMemo, useRef, useState } from "react";
import { Play, Square, RefreshCw, Activity, Route, RadioTower } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EventTimeline } from "../../components/runtime/EventTimeline";
import { StatusPill } from "../../components/status/StatusPill";
import { mapRecentActionsToRuntimeEvents } from "../../features/network/actionPresentation";
import {
  createDesktopCommandResult,
  desktopEngineLabel,
  desktopEngineSnapshot,
  desktopEngineTone,
  emptyInspectSnapshot,
} from "../../features/network/desktopPresentation";
import {
  describeActionName,
  describeActionSource,
  describeDesktopCommand,
  describeEdgeState,
  describeProcessLiveness,
  displayProcessId,
  displayMetric,
  explainLatencyMetric,
  explainOverlayMetric,
  summarizeNetworkQuality,
} from "../../features/network/networkSummary";
import { fetchNetworkStatus, fetchRecentActionsHistory, syncRecentAction, type NetworkStatus, type RecentAction } from "../../lib/api/network";
import {
  inspectNetworkBridge,
  startNetworkBridge,
  stopNetworkBridge,
  type DesktopCommandResult,
  type InspectSnapshot,
} from "../../lib/desktop/bridge";
import type { UserProfile } from "../../lib/profile/userProfile";
import { hasJoinedRoom, type ConnectionContext } from "../../lib/runtime/connectionContext";
import { appendRuntimeEvent, resolveRuntimeEvents, type RuntimeEvent } from "../../lib/runtime/runtimeEvents";
import { useLiveRefresh } from "../../lib/runtime/useLiveRefresh";
import type { AppSettings } from "../../lib/settings/appSettings";

const fallbackStatus: NetworkStatus = {
  overlayIp: "--",
  relay: "服务端未连接",
  routeMode: "unknown",
  edgeState: "idle",
  latency: "--",
  community: "vnetplay-room",
  supernode: "127.0.0.1:7777",
  secretMasked: "********",
  recentAction: {
    action: "unavailable",
    roomId: "未连接",
    username: "未同步",
    detail: "无法读取服务端侧网络状态",
    success: false,
    updatedAt: "--",
    source: "fallback",
    pid: null,
  },
};

const idleInspect: InspectSnapshot = {
  ...emptyInspectSnapshot,
  community: "vnetplay-room",
  supernode: "127.0.0.1:7777",
  commandPreview: 'Command { std: "n2n-edge" "-c" "vnetplay-room" "-l" "127.0.0.1:7777" }',
};

const idleResult: DesktopCommandResult = createDesktopCommandResult("等待执行桌面命令", {
  ok: true,
  inspect: idleInspect,
});

type NetworkPageProps = {
  profile: UserProfile;
  settings: AppSettings;
  connectionContext: ConnectionContext;
  onUpdateConnectionContext: (context: ConnectionContext) => void;
  startRequest: { id: number; roomId: string; serverBaseUrl: string; mode: "resume" } | null;
  onConsumeStartRequest: (id: number) => void;
};

function compactTime(value: string): string {
  if (value === "--") {
    return value;
  }

  const parts = value.split(" ");
  return parts[parts.length - 1] ?? value;
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

  const inspect = useMemo(() => desktopEngineSnapshot(inspectResult, commandResult.inspect ?? idleInspect), [inspectResult, commandResult.inspect]);
  const runtimeTone = desktopEngineTone(inspectResult, inspect);
  const runtimeLabel = desktopEngineLabel(inspectResult, inspect);
  const syncTone = status.recentAction.source.startsWith("desktop")
    ? (status.recentAction.success ? "online" : "warning")
    : "idle";
  const syncLabel = status.recentAction.source.startsWith("desktop")
    ? (status.recentAction.success ? "已回写" : "回写失败")
    : "待回写";
  const recentEvents = events.slice(0, 8);
  const serverHistoryEvents = useMemo(() => mapRecentActionsToRuntimeEvents(actionHistory.slice(0, 8)), [actionHistory]);
  const joinedRoom = hasJoinedRoom(connectionContext);
  const activeServerBaseUrl = connectionContext.serverBaseUrl || settings.serverBaseUrl;
  const routeQuality = useMemo(() => summarizeNetworkQuality(status), [status]);

  function resolveRoomScope(contextSnapshot: ConnectionContext = connectionContext): string | undefined {
    return hasJoinedRoom(contextSnapshot) ? contextSnapshot.roomId : undefined;
  }

  const stats = [
    { label: "本地网络", value: runtimeLabel, meta: `进程 ${displayProcessId(inspect.lastPid)}` },
    { label: "房间", value: joinedRoom ? connectionContext.roomId : settings.defaultRoomName, meta: profile.username },
    { label: "线路", value: displayMetric(status.latency, "待探测"), meta: routeQuality.routeModeLabel },
    { label: "时长", value: inspect.runtimeDurationLabel, meta: liveUpdatedAt === "--" ? displayMetric(status.overlayIp, "待心跳") : compactTime(liveUpdatedAt) },
  ];

  function recordEvent(input: Parameters<typeof appendRuntimeEvent>[0]) {
    setEvents(appendRuntimeEvent(input));
  }

  async function refreshStatus(serverBaseUrl = activeServerBaseUrl, roomId = resolveRoomScope()) {
    const nextStatus = await fetchNetworkStatus(serverBaseUrl, roomId);
    setStatus(nextStatus);
    return nextStatus;
  }

  async function syncActionToServer(action: string, result: DesktopCommandResult, source: string, roomId: string, serverBaseUrl = activeServerBaseUrl) {
    try {
      const recentAction = await syncRecentAction({
        action,
        roomId,
        username: profile.username,
        detail: result.detail,
        success: result.ok,
        source,
        pid: result.pid ?? null,
      }, serverBaseUrl);

      setStatus((current) => ({
        ...current,
        recentAction,
      }));
    } catch {
      await refreshStatus(serverBaseUrl, roomId);
    }
  }

  function syncConnectionFromInspect(
    result: DesktopCommandResult,
    source: ConnectionContext["source"],
    contextSnapshot: ConnectionContext = connectionContext,
  ) {
    const snapshot = result.inspect ?? idleInspect;
    const running = result.ok && snapshot.edgeState === "running" && snapshot.pidAlive;
    const nextJoinedRoom = contextSnapshot.joinedRoom;
    const nextRoomId = nextJoinedRoom
      ? (snapshot.roomId !== "--" && snapshot.roomId !== "未连接" ? snapshot.roomId : contextSnapshot.roomId)
      : "未连接";

    onUpdateConnectionContext({
      joinedRoom: nextJoinedRoom,
      roomId: nextRoomId,
      username: profile.username,
      serverBaseUrl: contextSnapshot.serverBaseUrl || activeServerBaseUrl,
      success: running,
      detail: result.detail,
      pid: snapshot.pidAlive ? (result.pid ?? snapshot.lastPid ?? null) : null,
      source,
      updatedAt: new Date().toLocaleString("zh-CN", { hour12: false }),
      runtimeDurationLabel: snapshot.runtimeDurationLabel,
    });
  }

  async function refreshLiveSnapshot(
    source: ConnectionContext["source"] = "inspect",
    contextSnapshot: ConnectionContext = connectionContext,
  ) {
    const roomScope = resolveRoomScope(contextSnapshot);
    const [nextStatus, nextInspect, nextHistory] = await Promise.all([
      fetchNetworkStatus(contextSnapshot.serverBaseUrl || activeServerBaseUrl, roomScope),
      inspectNetworkBridge(),
      fetchRecentActionsHistory(contextSnapshot.serverBaseUrl || activeServerBaseUrl, roomScope),
    ]);

    const nextSnapshot = nextInspect.inspect ?? idleInspect;
    const nextEdgeSignature = `${nextSnapshot.edgeState}:${nextSnapshot.pidAlive}:${nextSnapshot.lastPid ?? "n/a"}:${nextSnapshot.roomId}`;
    const nextServerSignature = `${nextStatus.recentAction.action}:${nextStatus.recentAction.updatedAt}:${nextStatus.recentAction.pid ?? "n/a"}:${nextStatus.recentAction.success}`;

    if (edgeSignatureRef.current && edgeSignatureRef.current !== nextEdgeSignature) {
      recordEvent({
        scope: "network",
        title: "本地网络变化",
        detail: `${describeEdgeState(nextSnapshot.edgeState)} · ${describeProcessLiveness(nextSnapshot.pidAlive)}`,
        tone: nextSnapshot.edgeState === "running" && nextSnapshot.pidAlive ? "online" : "idle",
        roomId: nextSnapshot.roomId !== "--" ? nextSnapshot.roomId : settings.defaultRoomName,
        source: "poll-edge",
      });
    }

    if (serverSignatureRef.current && serverSignatureRef.current !== nextServerSignature) {
      recordEvent({
        scope: "server",
        title: "服务端动作",
        detail: `${describeActionName(nextStatus.recentAction.action)} · ${nextStatus.recentAction.roomId}`,
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
    setLiveTone(desktopEngineTone(nextInspect, desktopEngineSnapshot(nextInspect, idleInspect)));
    setLiveLabel(desktopEngineLabel(nextInspect, desktopEngineSnapshot(nextInspect, idleInspect)));
    setLiveUpdatedAt(new Date().toLocaleString("zh-CN", { hour12: false }));
    syncConnectionFromInspect(nextInspect, source, contextSnapshot);
  }

  useEffect(() => {
    void refreshLiveSnapshot();
  }, [activeServerBaseUrl]);

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
    const targetServerBaseUrl = serverBaseUrlOverride ?? activeServerBaseUrl;
    const result = await startNetworkBridge({
      roomId: targetRoomId,
      username: profile.username,
      community: settings.defaultCommunity,
      supernode: settings.supernodeAddress,
      serverBaseUrl: targetServerBaseUrl,
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
    await syncActionToServer(
      trigger === "auto" ? "desktop-auto-start" : trigger === "resume" ? "desktop-resume-start" : "desktop-start",
      finalResult,
      trigger === "auto" ? "desktop-auto" : trigger === "resume" ? "desktop-resume" : "desktop-manual",
      targetRoomId,
      targetServerBaseUrl,
    );
    const nextConnectionContext: ConnectionContext = {
      joinedRoom: true,
      roomId: targetRoomId,
      username: profile.username,
      serverBaseUrl: targetServerBaseUrl,
      success: running,
      detail,
      pid: result.pid ?? null,
      source: trigger === "auto" ? "auto-start" : trigger === "resume" ? "resume" : "manual-start",
      updatedAt: new Date().toLocaleString("zh-CN", { hour12: false }),
      runtimeDurationLabel: finalResult.inspect?.runtimeDurationLabel ?? "idle",
    };
    onUpdateConnectionContext(nextConnectionContext);
    await refreshLiveSnapshot(
      trigger === "auto" ? "auto-start" : trigger === "resume" ? "resume" : "manual-start",
      nextConnectionContext,
    );
  }

  async function handleStopNetwork() {
    const currentRoomId = joinedRoom ? connectionContext.roomId : settings.defaultRoomName;
    const result = await stopNetworkBridge();
    recordEvent({
      scope: "network",
      title: result.ok ? "已停止" : "停止失败",
      detail: result.detail,
      tone: result.ok ? "idle" : "warning",
      roomId: currentRoomId,
      source: "desktop-manual",
    });
    setCommandResult(result);
    setInspectResult(result);
    await syncActionToServer("desktop-stop", result, "desktop-manual", currentRoomId);
    onUpdateConnectionContext({
      joinedRoom,
      roomId: joinedRoom ? connectionContext.roomId : "未连接",
      username: profile.username,
      serverBaseUrl: activeServerBaseUrl,
      success: false,
      detail: result.detail,
      pid: null,
      source: "stop",
      updatedAt: new Date().toLocaleString("zh-CN", { hour12: false }),
      runtimeDurationLabel: result.inspect?.runtimeDurationLabel ?? "idle",
    });
    await refreshLiveSnapshot("stop");
  }

  async function handleInspectNetwork() {
    const currentRoomId = joinedRoom ? connectionContext.roomId : settings.defaultRoomName;
    const result = await inspectNetworkBridge();
    const running = result.ok && Boolean(result.inspect?.pidAlive) && result.inspect?.edgeState === "running";
    recordEvent({
      scope: "network",
      title: result.ok ? "检查完成" : "检查失败",
      detail: result.detail,
      tone: result.ok ? (running ? "online" : "idle") : "warning",
      roomId: currentRoomId,
      source: "desktop-manual",
    });
    setCommandResult(result);
    setInspectResult(result);
    await syncActionToServer("desktop-inspect", result, "desktop-manual", currentRoomId);
    onUpdateConnectionContext({
      joinedRoom,
      roomId: joinedRoom ? connectionContext.roomId : "未连接",
      username: profile.username,
      serverBaseUrl: activeServerBaseUrl,
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
    if (!settings.autoConnectOnLaunch || autoConnectTriggeredRef.current || !joinedRoom) {
      return;
    }

    autoConnectTriggeredRef.current = true;
    void handleStartNetwork("auto", connectionContext.roomId, activeServerBaseUrl);
  }, [settings.autoConnectOnLaunch, settings.defaultCommunity, settings.supernodeAddress, profile.username, joinedRoom, connectionContext.roomId, activeServerBaseUrl]);

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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((item) => (
          <Card key={item.label} className="border-border/70 bg-card/90 shadow-sm">
            <CardContent className="pt-6">
              <p className="mb-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">{item.label}</p>
              <p className="mb-1 break-words text-2xl font-semibold">{item.value}</p>
              <p className="text-sm text-muted-foreground break-words">{item.meta}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 控制面板 */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle>控制台</CardTitle>
              <CardDescription>启动、停止、检查网络连接</CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <StatusPill tone={runtimeTone} text={runtimeLabel} />
              <span>轮询 5s · {liveUpdatedAt}</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
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

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <div className="key-value-item">
              <span>用户</span>
              <span>{profile.username}</span>
            </div>
            <div className="key-value-item">
              <span>房间</span>
              <span>{joinedRoom ? connectionContext.roomId : settings.defaultRoomName}</span>
            </div>
            <div className="key-value-item">
              <span>群组</span>
              <span>{settings.defaultCommunity}</span>
            </div>
            <div className="key-value-item">
              <span>节点</span>
              <span>{settings.supernodeAddress}</span>
            </div>
            <div className="key-value-item">
              <span>自动</span>
              <span>{settings.autoConnectOnLaunch ? "开" : "关"}</span>
            </div>
            <div className="key-value-item">
              <span>服务端</span>
              <span>{activeServerBaseUrl || "未填"}</span>
            </div>
          </div>

          <div className="rounded-2xl border border-border/60 bg-muted/40 p-4">
            <p className="text-sm leading-6 text-foreground">{commandResult.detail}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              状态: {commandResult.ok ? "成功" : "失败"} | 进程: {displayProcessId(commandResult.pid)} | 存活: {describeProcessLiveness(inspect.pidAlive)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              虚拟IP: {displayMetric(status.overlayIp, "待心跳")} | 延迟: {displayMetric(status.latency, "待探测")} | 线路: {displayMetric(status.relay, "待判定")}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-card/90 shadow-sm">
        <CardHeader>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle>线路解读</CardTitle>
              <CardDescription>把实时心跳、虚拟 IP 和延迟数据翻译成更容易判断的结果。</CardDescription>
            </div>
            <StatusPill tone={routeQuality.tone} text={routeQuality.label} />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-border/60 bg-muted/25 p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Activity className="h-4 w-4 text-primary" />
                虚拟 IP
              </div>
              <p className="mt-3 break-all text-lg font-semibold">{displayMetric(status.overlayIp, "待心跳")}</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {explainOverlayMetric(status.overlayIp)}
              </p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-muted/25 p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <RadioTower className="h-4 w-4 text-primary" />
                延迟
              </div>
              <p className="mt-3 text-lg font-semibold">{displayMetric(status.latency, "待探测")}</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {explainLatencyMetric(status.latency)}
              </p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-muted/25 p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Route className="h-4 w-4 text-primary" />
                路由提示
              </div>
              <p className="mt-3 text-base font-semibold break-words">{displayMetric(status.relay, "待判定")}</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {routeQuality.detail} 当前策略：{routeQuality.routeModeLabel}。
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 本机和服务端信息 */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>本机状态</CardTitle>
              <StatusPill tone={runtimeTone} text={runtimeLabel} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="key-value-grid">
              <div className="key-value-item"><span>虚拟 IP</span><span>{displayMetric(status.overlayIp, "待心跳")}</span></div>
              <div className="key-value-item"><span>线路提示</span><span>{displayMetric(status.relay, "待判定")}</span></div>
              <div className="key-value-item"><span>路由策略</span><span>{routeQuality.routeModeLabel}</span></div>
              <div className="key-value-item"><span>本地网络状态</span><span>{describeEdgeState(inspect.edgeState)}</span></div>
              <div className="key-value-item"><span>最近命令</span><span>{describeDesktopCommand(inspect.lastCommand)}</span></div>
              <div className="key-value-item"><span>启动于</span><span>{inspect.runtimeStartedAt}</span></div>
              <div className="key-value-item"><span>进程</span><span>{displayProcessId(inspect.lastPid)}</span></div>
              <div className="key-value-item"><span>进程存活</span><span>{describeProcessLiveness(inspect.pidAlive)}</span></div>
              <div className="key-value-item"><span>运行时长</span><span>{inspect.runtimeDurationLabel}</span></div>
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
              <div className="key-value-item"><span>最近动作</span><span>{describeActionName(status.recentAction.action)}</span></div>
              <div className="key-value-item"><span>房间</span><span>{status.recentAction.roomId}</span></div>
              <div className="key-value-item"><span>用户</span><span>{status.recentAction.username}</span></div>
              <div className="key-value-item"><span>来源</span><span>{describeActionSource(status.recentAction.source)}</span></div>
              <div className="key-value-item"><span>进程</span><span>{displayProcessId(status.recentAction.pid)}</span></div>
              <div className="key-value-item"><span>时间</span><span>{status.recentAction.updatedAt}</span></div>
            </div>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              服务端状态卡展示的是当前房间最近一次被回写的动作。若这里已经变化，但线路解读仍显示“等待心跳”，通常说明动作已同步，实时网络指标还在更新中。
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 事件时间线 */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
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
