import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Apple,
  ArrowRight,
  BookOpen,
  Bug,
  CheckCircle2,
  Globe2,
  Laptop2,
  MonitorSmartphone,
  Server,
  ShieldCheck,
  TerminalSquare,
} from "lucide-react";

type PlatformKey = "windows" | "macos" | "linux";

type GuideSection = {
  title: string;
  description: string;
  bullets: string[];
  command?: string;
  note?: string;
};

type TroubleshootingItem = {
  title: string;
  detail: string;
};

type PlatformGuide = {
  label: string;
  badge: string;
  summary: string;
  serverPackage: string;
  clientPackage: string;
  prerequisites: string[];
  serverSteps: GuideSection[];
  clientSteps: GuideSection[];
  workflow: string[];
  validation: string[];
  troubleshooting: TroubleshootingItem[];
};

const platformGuides: Record<PlatformKey, PlatformGuide> = {
  windows: {
    label: "Windows",
    badge: "推荐桌面玩家",
    summary: "适合直接双击运行桌面端与服务端，也最容易验证 QQ 登录和 Tauri 弹窗流程。",
    serverPackage: "vnetplay-server-windows-amd64.exe",
    clientPackage: "VNetPlay Desktop Windows Installer",
    prerequisites: [
      "准备一台可被其他玩家访问的服务器，或至少一台局域网内可直连的 Windows 主机。",
      "确认防火墙已开放 9080/TCP、7777/UDP、5645/UDP，避免控制面和 n2n 通道被拦截。",
      "确保 n2n 相关可执行文件可被 VNetPlay 调起；若是自带打包版本，确认它与桌面端位于同一发布目录。",
    ],
    serverSteps: [
      {
        title: "下载并放置服务端",
        description: "将服务端可执行文件放到固定目录，例如 `C:\\vnetplay\\server`，便于后续做防火墙和开机启动配置。",
        bullets: [
          "如果只是临时开房，下载后直接放到任意目录即可。",
          "如果要长期作为房主服务器，建议使用固定目录并创建快捷方式。",
        ],
      },
      {
        title: "首次启动服务端",
        description: "先确认控制面端口能正常监听，再决定是否调整端口。",
        command: "vnetplay-server-windows-amd64.exe --http-port 9080 --supernode-port 7777 --edge-port 5645",
        bullets: [
          "看到监听日志后，再把 `http://你的IP:9080` 发给其他玩家。",
          "如果你只在本机测试，也可以先用 `http://127.0.0.1:9080`。",
        ],
        note: "若弹出 Windows 防火墙提示，请允许专用网络和公用网络访问。",
      },
      {
        title: "固定开放端口",
        description: "服务端能启动不代表别人能连上，公网或局域网环境都需要确认端口开放。",
        bullets: [
          "HTTP 控制面使用 9080/TCP。",
          "Supernode 通常使用 7777/UDP。",
          "Edge 虚拟网络通道通常使用 5645/UDP。",
        ],
      },
    ],
    clientSteps: [
      {
        title: "安装桌面客户端",
        description: "安装完成后先进入 `设置` 页面，不要急着开房或进房。",
        bullets: [
          "服务器地址填房主提供的 HTTP 地址，例如 `http://192.168.1.10:9080`。",
          "Supernode 默认填房主机器的 `IP:7777`。",
          "默认房间名建议和常用房间保持一致，后续继续联机更顺手。",
        ],
      },
      {
        title: "可选：使用 QQ 登录",
        description: "在 `设置 -> 用户信息` 点击 `使用QQ登录`，在弹窗中完成授权。",
        bullets: [
          "登录成功后主窗口会自动刷新头像和昵称。",
          "若主窗口没变化，请先回到主窗口，再打开 `设置` 查看登录状态。",
        ],
      },
      {
        title: "进入联机流程",
        description: "回到 `联机` 页面，创建或加入房间；进入房间后再切到 `网络` 页面启动本地 edge。",
        bullets: [
          "创建房间后会先进入房间态，不代表网络已经启动。",
          "看到 `房间` 页面后，点击 `继续联机` 才会真正尝试启动本机网络。",
        ],
      },
    ],
    workflow: [
      "`设置`：填服务器地址、Supernode、默认房间名。",
      "`联机`：创建房间或加入房间，确认没有报错。",
      "`房间`：核对房间号和成员列表，点击 `继续联机`。",
      "`网络`：确认 Edge 为在线、PID 正常、服务端 recent action 与当前房间一致。",
      "`排障`：如果服务端不可达或 recent action 漂移，在这里看原因。",
    ],
    validation: [
      "`房间` 页面能看到自己，且房间号正确。",
      "`网络` 页面 `Edge` 状态为在线，`PID` 不为空。",
      "`排障` 页面显示服务端在线，状态同步为已对齐或无明显阻塞。",
    ],
    troubleshooting: [
      {
        title: "能看到房间但继续联机失败",
        detail: "优先检查 `Supernode` 地址、Windows 防火墙和 n2n-edge 是否可执行。",
      },
      {
        title: "QQ 登录弹窗授权成功但主窗口无变化",
        detail: "回到主窗口查看 `设置`，若仍未登录，通常是登录窗口通信未成功，需要重新发起一次登录。",
      },
      {
        title: "其他玩家连不上你的服务端",
        detail: "确认 9080/TCP 已开放，且你发给对方的是你的局域网 IP 或公网 IP，而不是 `127.0.0.1`。",
      },
    ],
  },
  macos: {
    label: "macOS",
    badge: "适合房主或开发测试",
    summary: "重点是可执行权限、系统安全提示和回调地址配置，尤其适用于 Apple Silicon 与 Intel 两类包。",
    serverPackage: "vnetplay-server-darwin-arm64 / vnetplay-server-darwin-amd64",
    clientPackage: "VNetPlay Desktop macOS Bundle",
    prerequisites: [
      "确认下载的服务端和桌面端包与当前芯片架构一致。",
      "首次运行可执行文件前，建议先放到固定目录，例如 `~/Applications/vnetplay`。",
      "如果系统提示来源不明，需要在 `系统设置 -> 隐私与安全性` 中允许运行。",
    ],
    serverSteps: [
      {
        title: "授予服务端执行权限",
        description: "macOS 下载后的二进制默认可能不可执行，先补 `chmod +x`。",
        command: "chmod +x ./vnetplay-server-darwin-arm64\n./vnetplay-server-darwin-arm64 --http-port 9080 --supernode-port 7777 --edge-port 5645",
        bullets: [
          "Intel 机器请替换为 amd64 包名。",
          "如果 Gatekeeper 阻止运行，先右键打开一次，再回终端执行。",
        ],
      },
      {
        title: "确认本机网络权限",
        description: "控制面和虚拟网络都依赖系统网络权限，必要时允许终端或桌面端访问网络。",
        bullets: [
          "局域网联机请确保同网段设备能访问到 `9080` 端口。",
          "公网联机还需要路由器/云防火墙同时放行。",
        ],
      },
    ],
    clientSteps: [
      {
        title: "启动桌面端并填写设置",
        description: "先打开 `设置`，再回到 `联机`，不要一开始就直接点继续联机。",
        bullets: [
          "服务器地址填 `http://服务器IP:9080`。",
          "Supernode 填 `服务器IP:7777`。",
          "如果你使用打包后的桌面环境做 QQ 登录，建议配置专用 `VITE_QQ_REDIRECT_URI`。",
        ],
      },
      {
        title: "完成房间和网络流程",
        description: "macOS 下同样是先加入房间，再到 `网络` 页面启动本地 edge。",
        bullets: [
          "如果 `房间` 页面已显示你，但 `网络` 页面仍 idle，说明房间态和网络态还没闭环。",
          "可以在 `排障` 页面查看服务端和本机 inspect 是否一致。",
        ],
      },
    ],
    workflow: [
      "准备好对应架构的 server 与 desktop 包。",
      "在终端启动 server，并记下对外地址。",
      "在桌面端 `设置` 中填服务端与 Supernode。",
      "在 `联机` 创建或加入房间。",
      "在 `房间` 点击 `继续联机`，再去 `网络` 核对 PID 和 recent action。",
    ],
    validation: [
      "server 终端有监听日志，没有被系统安全策略直接杀掉。",
      "桌面端 `排障` 页能读到服务端健康状态。",
      "当前房间 recent action 不会被别的房间覆盖。",
    ],
    troubleshooting: [
      {
        title: "点击桌面端无响应或被系统拦截",
        detail: "先到 `系统设置 -> 隐私与安全性` 允许应用运行，再重新打开。",
      },
      {
        title: "QQ 登录能打开外部页面，但关闭后主窗口没同步",
        detail: "优先检查是否使用了正确的回调地址；打包环境建议显式配置 `VITE_QQ_REDIRECT_URI`。",
      },
      {
        title: "继续联机后状态仍 idle",
        detail: "通常是 n2n-edge 无法正常启动，或系统未允许桌面端访问相关可执行文件。",
      },
    ],
  },
  linux: {
    label: "Linux",
    badge: "适合长期托管与自建服务器",
    summary: "推荐把服务端作为常驻进程或 systemd 服务运行，客户端则重点确认可执行权限与端口策略。",
    serverPackage: "vnetplay-server-linux-amd64",
    clientPackage: "VNetPlay Desktop Linux Bundle",
    prerequisites: [
      "准备一台能稳定在线的 Linux 主机，最好有固定 IP 或域名。",
      "确认 `ufw`、`firewalld` 或云安全组已放通所需端口。",
      "建议把服务端和未来数据目录放到 `/opt/vnetplay` 或 `~/vnetplay`。",
    ],
    serverSteps: [
      {
        title: "授予执行权限并启动",
        description: "Linux 一般直接走终端即可，建议先手动跑通，再做 systemd 化。",
        command: "chmod +x ./vnetplay-server-linux-amd64\n./vnetplay-server-linux-amd64 --http-port 9080 --supernode-port 7777 --edge-port 5645",
        bullets: [
          "如果是云服务器，记得同时开放系统防火墙和云平台安全组。",
          "日志正常后，再把地址给客户端使用。",
        ],
      },
      {
        title: "可选：作为 systemd 服务托管",
        description: "适合长期托管，避免 SSH 断开后服务退出。",
        command: "sudo systemctl enable vnetplay-server\nsudo systemctl start vnetplay-server\nsudo systemctl status vnetplay-server",
        bullets: [
          "先确认可执行文件路径固定。",
          "托管前建议把工作目录和数据目录规划清楚。",
        ],
      },
    ],
    clientSteps: [
      {
        title: "桌面端配置",
        description: "Linux 客户端流程和其他平台一致，优先在 `设置` 页面把地址配对正确。",
        bullets: [
          "服务器地址填 `http://你的Linux服务器IP:9080`。",
          "Supernode 填 `你的Linux服务器IP:7777`。",
          "若是局域网测试，也要确保同网段设备能访问该 Linux 主机。",
        ],
      },
      {
        title: "联机和排障",
        description: "先建立房间，再启动网络，最后看 `排障` 页面确认状态是否一致。",
        bullets: [
          "如果 `recent action` 不属于当前房间，说明你需要重新检查房间选择。",
          "如果 `Overlay IP` 为 `--`，说明服务端当前还没收到有效 heartbeat。",
        ],
      },
    ],
    workflow: [
      "终端确认服务端能长期稳定运行。",
      "客户端 `设置` 填 Linux 服务端地址与 Supernode。",
      "在 `联机` 创建/加入房间。",
      "在 `房间` 页面确认成员后，点击 `继续联机`。",
      "在 `网络` 和 `排障` 页面确认 room-scoped 状态没有漂移。",
    ],
    validation: [
      "`curl http://服务器IP:9080/health` 返回正常。",
      "桌面端 `排障` 页显示服务端在线。",
      "`网络` 页 recent action 和当前房间一致，不会串房。",
    ],
    troubleshooting: [
      {
        title: "服务端本机可访问，外部不可访问",
        detail: "通常是 Linux 防火墙、云安全组或 NAT 转发没有配齐。",
      },
      {
        title: "房间创建成功但没有 Overlay IP",
        detail: "说明服务端控制面可用，但还没有收到属于该房间的有效 heartbeat。",
      },
      {
        title: "systemd 看起来启动了，但桌面端不可达",
        detail: "先检查服务绑定地址、端口占用和 `journalctl -u vnetplay-server` 输出。",
      },
    ],
  },
};

const pageMap = [
  { title: "设置", detail: "先填服务器地址、Supernode、默认房间名，QQ 登录也在这里完成。" },
  { title: "联机", detail: "创建房间或加入房间，完成房间层的选择和保存。" },
  { title: "房间", detail: "核对房间号、成员、邀请信息，并点击 `继续联机`。" },
  { title: "网络", detail: "真正启动本机 edge，检查 PID、recent action 和当前线路状态。" },
  { title: "排障", detail: "对比服务端、本机 inspect 和同步状态，用来定位启动失败或串状态问题。" },
];

function renderSection(section: GuideSection) {
  return (
    <Card key={section.title} className="border-border/70 bg-card/90 shadow-sm">
      <CardHeader className="space-y-2">
        <CardTitle className="text-lg">{section.title}</CardTitle>
        <CardDescription className="leading-6">{section.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="space-y-2 text-sm text-muted-foreground">
          {section.bullets.map((item) => (
            <li key={item} className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
              <span className="leading-6">{item}</span>
            </li>
          ))}
        </ul>
        {section.command ? (
          <pre className="guide-code-block whitespace-pre-wrap break-all">
            <code>{section.command}</code>
          </pre>
        ) : null}
        {section.note ? (
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-muted-foreground">
            {section.note}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function GuidePage() {
  const [platform, setPlatform] = useState<PlatformKey>("windows");

  const guide = useMemo(() => platformGuides[platform], [platform]);

  return (
    <div className="guide-shell">
      <section className="guide-hero">
        <div className="relative z-10 flex flex-col gap-6">
          <div className="flex flex-wrap items-center gap-3">
            <Badge className="rounded-full bg-primary/10 px-3 py-1 text-primary hover:bg-primary/10">
              <BookOpen className="mr-2 h-3.5 w-3.5" />
              分平台详细教程
            </Badge>
            <Badge variant="outline" className="rounded-full px-3 py-1">
              {"先设置 -> 再联机 -> 再启动网络"}
            </Badge>
          </div>
          <div className="space-y-3">
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">VNetPlay 使用说明</h1>
            <p className="max-w-3xl text-sm leading-7 text-muted-foreground md:text-base">
              这份教程按实际软件操作顺序编排，不再混写平台差异。先选择你的平台，再照着 `设置`、`联机`、`房间`、`网络`、`排障` 五个页面一步一步做。
            </p>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Card className="border-border/60 bg-background/80 shadow-sm">
              <CardContent className="flex items-start gap-3 pt-6">
                <Server className="mt-0.5 h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-medium">先让服务端能被访问</p>
                  <p className="mt-1 text-sm text-muted-foreground">只有 HTTP 控制面和 Supernode 端口都通，客户端才有意义。</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/60 bg-background/80 shadow-sm">
              <CardContent className="flex items-start gap-3 pt-6">
                <MonitorSmartphone className="mt-0.5 h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-medium">先加入房间，再启动网络</p>
                  <p className="mt-1 text-sm text-muted-foreground">房间状态和网络状态是两步，不是一个按钮就全部完成。</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/60 bg-background/80 shadow-sm">
              <CardContent className="flex items-start gap-3 pt-6">
                <ShieldCheck className="mt-0.5 h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-medium">出问题先看排障页</p>
                  <p className="mt-1 text-sm text-muted-foreground">它会同时比较服务端状态、本机 inspect、recent action 是否对齐。</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">选择平台</h2>
          <p className="text-sm text-muted-foreground">点击不同平台后，会切换到该平台对应的服务端启动、客户端配置和排障说明。</p>
        </div>
        <div className="guide-platform-switch">
          {(
            [
              { key: "windows" as const, icon: Laptop2 },
              { key: "macos" as const, icon: Apple },
              { key: "linux" as const, icon: TerminalSquare },
            ]
          ).map(({ key, icon: Icon }) => (
            <Button
              key={key}
              variant={platform === key ? "default" : "ghost"}
              className="rounded-xl px-4"
              onClick={() => setPlatform(key)}
            >
              <Icon className="mr-2 h-4 w-4" />
              {platformGuides[key].label}
            </Button>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-[1.35fr_0.95fr]">
        <Card className="border-border/70 bg-card/90 shadow-sm">
          <CardHeader>
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle>{guide.label} 教程</CardTitle>
              <Badge variant="outline">{guide.badge}</Badge>
            </div>
            <CardDescription className="leading-6">{guide.summary}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-border/60 bg-muted/30 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">服务端包</p>
                <p className="mt-2 font-medium text-foreground break-words">{guide.serverPackage}</p>
              </div>
              <div className="rounded-2xl border border-border/60 bg-muted/30 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">客户端包</p>
                <p className="mt-2 font-medium text-foreground break-words">{guide.clientPackage}</p>
              </div>
            </div>
            <div className="rounded-2xl border border-border/60 bg-muted/25 p-4">
              <p className="text-sm font-medium text-foreground">开始前先准备</p>
              <ul className="mt-3 space-y-2">
                {guide.prerequisites.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                    <span className="leading-6">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/90 shadow-sm">
          <CardHeader>
            <CardTitle>软件内页面顺序</CardTitle>
            <CardDescription>教程里的每一步都和软件里的真实页面对应。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {pageMap.map((item, index) => (
              <div key={item.title} className="flex items-start gap-3 rounded-2xl border border-border/60 bg-muted/25 p-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">
                  {index + 1}
                </div>
                <div>
                  <p className="font-medium">{item.title}</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.detail}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Server className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">服务端部署</h2>
        </div>
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          {guide.serverSteps.map((section) => renderSection(section))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <MonitorSmartphone className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">客户端配置</h2>
        </div>
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          {guide.clientSteps.map((section) => renderSection(section))}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card className="border-border/70 bg-card/90 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Globe2 className="h-5 w-5 text-primary" />
              <CardTitle>实际联机流程</CardTitle>
            </div>
            <CardDescription>从打开软件到真正开始联机的完整顺序。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {guide.workflow.map((item, index) => (
              <div key={item} className="flex items-start gap-3 rounded-2xl border border-border/60 bg-muted/25 p-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-semibold">
                  {index + 1}
                </div>
                <div className="flex-1 text-sm leading-6 text-muted-foreground">{item}</div>
                {index < guide.workflow.length - 1 ? <ArrowRight className="mt-1 hidden h-4 w-4 text-muted-foreground lg:block" /> : null}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/90 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <CardTitle>联机成功后的自检</CardTitle>
            </div>
            <CardDescription>满足这些条件时，说明你的流程基本已经跑通。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {guide.validation.map((item) => (
              <div key={item} className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-sm leading-6 text-muted-foreground">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                  <span>{item}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Bug className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">常见问题</h2>
        </div>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          {guide.troubleshooting.map((item) => (
            <Card key={item.title} className="border-amber-500/20 bg-amber-500/5 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">{item.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-6 text-muted-foreground">{item.detail}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
