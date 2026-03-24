import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Book, Server, Monitor, Terminal, CheckCircle2, AlertCircle } from "lucide-react";

export function GuidePage() {
  return (
    <div className="space-y-6 pb-8">
      {/* 标题 */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold flex items-center justify-center gap-2">
          <Book className="w-6 h-6" />
          VNetPlay 使用教程
        </h1>
        <p className="text-muted-foreground">虚拟局域网联机工具配置指南</p>
      </div>

      {/* 快速开始 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">快速开始</CardTitle>
          <CardDescription>3步完成联机配置</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
              <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">1</div>
              <div>
                <p className="font-medium">启动服务端</p>
                <p className="text-sm text-muted-foreground">运行服务器程序</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
              <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">2</div>
              <div>
                <p className="font-medium">配置客户端</p>
                <p className="text-sm text-muted-foreground">填写服务器地址</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
              <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">3</div>
              <div>
                <p className="font-medium">创建/加入房间</p>
                <p className="text-sm text-muted-foreground">开始联机游戏</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 服务端配置 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Server className="w-4 h-4" />
            服务端配置
          </CardTitle>
          <CardDescription>VNetPlay Server 安装与配置指南</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              <Badge variant="outline">Step 1</Badge>
              下载服务端程序
            </h4>
            <div className="p-4 rounded-lg bg-muted/50 space-y-2">
              <p className="text-sm">从 GitHub Releases 下载对应平台的可执行文件：</p>
              <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                <li><code className="text-xs bg-muted px-1 rounded">vnetplay-server-windows-amd64.exe</code> - Windows 64位</li>
                <li><code className="text-xs bg-muted px-1 rounded">vnetplay-server-linux-amd64</code> - Linux 64位</li>
                <li><code className="text-xs bg-muted px-1 rounded">vnetplay-server-darwin-amd64</code> - macOS Intel</li>
                <li><code className="text-xs bg-muted px-1 rounded">vnetplay-server-darwin-arm64</code> - macOS Apple Silicon</li>
              </ul>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              <Badge variant="outline">Step 2</Badge>
              启动服务端
            </h4>
            <div className="p-4 rounded-lg bg-muted/50 font-mono text-sm space-y-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Terminal className="w-4 h-4" />
                <span>Windows:</span>
              </div>
              <pre className="bg-background p-2 rounded overflow-x-auto">vnetplay-server-windows-amd64.exe</pre>
              <div className="flex items-center gap-2 text-muted-foreground mt-3">
                <Terminal className="w-4 h-4" />
                <span>Linux/macOS:</span>
              </div>
              <pre className="bg-background p-2 rounded overflow-x-auto">chmod +x vnetplay-server-linux-amd64
./vnetplay-server-linux-amd64</pre>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              <Badge variant="outline">Step 3</Badge>
              配置参数（可选）
            </h4>
            <div className="p-4 rounded-lg bg-muted/50 space-y-2">
              <p className="text-sm">服务端支持以下命令行参数：</p>
              <table className="text-sm w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">参数</th>
                    <th className="text-left py-2">默认值</th>
                    <th className="text-left py-2">说明</th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground">
                  <tr className="border-b">
                    <td className="py-2"><code className="text-xs bg-background px-1 rounded">--http-port</code></td>
                    <td className="py-2">9080</td>
                    <td className="py-2">HTTP API 端口</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2"><code className="text-xs bg-background px-1 rounded">--supernode-port</code></td>
                    <td className="py-2">7777</td>
                    <td className="py-2">N2N Supernode 端口</td>
                  </tr>
                  <tr>
                    <td className="py-2"><code className="text-xs bg-background px-1 rounded">--edge-port</code></td>
                    <td className="py-2">5645</td>
                    <td className="py-2">N2N Edge 端口</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="p-4 rounded-lg border border-green-500/30 bg-green-500/5">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" />
              <div>
                <p className="font-medium text-green-700 dark:text-green-400">启动成功</p>
                <p className="text-sm text-muted-foreground">
                  当看到 <code className="text-xs bg-muted px-1 rounded">HTTP server listening on :9080</code> 时，服务端已就绪。
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 客户端配置 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Monitor className="w-4 h-4" />
            客户端配置
          </CardTitle>
          <CardDescription>VNetPlay Desktop 客户端配置指南</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              <Badge variant="outline">Step 1</Badge>
              下载客户端
            </h4>
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-sm">从 GitHub Releases 下载桌面客户端安装包并安装。</p>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              <Badge variant="outline">Step 2</Badge>
              配置服务器地址
            </h4>
            <div className="p-4 rounded-lg bg-muted/50 space-y-2">
              <p className="text-sm">打开【设置】页面，在"服务器地址"输入框填写：</p>
              <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                <li>本机测试：<code className="text-xs bg-background px-1 rounded">http://127.0.0.1:9080</code></li>
                <li>局域网连接：<code className="text-xs bg-background px-1 rounded">http://192.168.x.x:9080</code></li>
                <li>公网服务器：<code className="text-xs bg-background px-1 rounded">http://your-server.com:9080</code></li>
              </ul>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              <Badge variant="outline">Step 3</Badge>
              配置 Supernode 地址
            </h4>
            <div className="p-4 rounded-lg bg-muted/50 space-y-2">
              <p className="text-sm">Supernode 是 N2N 网络的超级节点，用于协调 P2P 连接：</p>
              <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                <li>使用服务端自带：<code className="text-xs bg-background px-1 rounded">127.0.0.1:7777</code>（本机）或 <code className="text-xs bg-background px-1 rounded">服务器IP:7777</code></li>
                <li>使用公共节点：<code className="text-xs bg-background px-1 rounded">n2n.luckz.cn:10086</code></li>
              </ul>
            </div>
          </div>

          <div className="p-4 rounded-lg border border-yellow-500/30 bg-yellow-500/5">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-500 mt-0.5" />
              <div>
                <p className="font-medium text-yellow-700 dark:text-yellow-400">防火墙提醒</p>
                <p className="text-sm text-muted-foreground">
                  确保服务器防火墙开放 <code className="text-xs bg-muted px-1 rounded">9080</code>（HTTP）、<code className="text-xs bg-muted px-1 rounded">7777</code>（Supernode）、<code className="text-xs bg-muted px-1 rounded">5645</code>（Edge UDP）端口。
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 联机操作 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">联机操作</CardTitle>
          <CardDescription>创建或加入房间开始联机</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="p-4 rounded-lg bg-muted/50 space-y-2">
              <h4 className="font-medium">创建房间</h4>
              <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-1">
                <li>在首页点击"创建房间"</li>
                <li>输入房间名称（所有玩家需相同）</li>
                <li>设置虚拟IP（可选，默认自动分配）</li>
                <li>点击"开始"加入虚拟网络</li>
              </ol>
            </div>
            <div className="p-4 rounded-lg bg-muted/50 space-y-2">
              <h4 className="font-medium">加入房间</h4>
              <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-1">
                <li>在首页点击"加入房间"</li>
                <li>输入与房主相同的房间名称</li>
                <li>点击"开始"加入虚拟网络</li>
                <li>通过虚拟IP与其他玩家通信</li>
              </ol>
            </div>
          </div>

          <div className="p-4 rounded-lg border border-blue-500/30 bg-blue-500/5">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-5 h-5 text-blue-500 mt-0.5" />
              <div>
                <p className="font-medium text-blue-700 dark:text-blue-400">连接成功后</p>
                <p className="text-sm text-muted-foreground">
                  在房间页面可以看到所有在线玩家及其虚拟IP，使用这些IP地址进行游戏联机。
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
