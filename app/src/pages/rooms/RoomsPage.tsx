import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Users,
  Wifi,
  Server,
  Gamepad2,
  Share2,
  Crown,
  Copy,
  Check,
  Monitor,
  Globe,
  Link2,
  ArrowLeft,
} from "lucide-react";
import type { UserProfile } from "../../lib/profile/userProfile";
import type { ConnectionContext } from "../../lib/runtime/connectionContext";
import type { AppSettings } from "../../lib/settings/appSettings";

type RoomsPageProps = {
  profile: UserProfile;
  settings: AppSettings;
  connectionContext: ConnectionContext;
  onSaveSettings: (input: Partial<AppSettings>) => void;
  onOpenPage: (key: string) => void;
  onRequestNetworkStart?: (input: { roomId: string; serverBaseUrl: string; mode: "resume" }) => void;
  onUpdateConnectionContext: (context: ConnectionContext) => void;
};

// 模拟房间用户数据
const mockRoomUsers = [
  { id: "1", name: "玩家A", isHost: true, latency: 12, ip: "10.144.0.1", avatar: null },
  { id: "2", name: "玩家B", isHost: false, latency: 28, ip: "10.144.0.2", avatar: null },
  { id: "3", name: "玩家C", isHost: false, latency: 35, ip: "10.144.0.3", avatar: null },
];

export function RoomsPage({
  profile,
  settings,
  connectionContext,
  onOpenPage,
  onUpdateConnectionContext,
}: RoomsPageProps) {
  const [showLaunchDialog, setShowLaunchDialog] = useState(false);
  const [launchPath, setLaunchPath] = useState("");
  const [copied, setCopied] = useState(false);

  const isInRoom = connectionContext.success && connectionContext.roomId !== "未连接";

  const handleCopyRoomId = async () => {
    if (connectionContext.roomId) {
      await navigator.clipboard.writeText(connectionContext.roomId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleLeaveRoom = () => {
    onUpdateConnectionContext({
      ...connectionContext,
      success: false,
      roomId: "未连接",
      detail: "已退出房间",
      source: "stop",
    });
    onOpenPage("home");
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
      {/* 房间信息卡 */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Link2 className="w-5 h-5" />
              {connectionContext.roomId}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyRoomId}
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? "已复制" : "复制"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLeaveRoom}
                className="text-muted-foreground"
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                退出
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-lg bg-muted/50 text-center">
              <Users className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
              <p className="text-sm font-medium">{mockRoomUsers.length} 人在线</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 text-center">
              <Server className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
              <p className="text-sm font-medium">{settings.supernodeAddress || "默认节点"}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 text-center">
              <Globe className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
              <p className="text-sm font-medium">P2P 直连</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 成员列表 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">房间成员</CardTitle>
            <Badge variant="secondary">{mockRoomUsers.length}人</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {mockRoomUsers.map((user) => (
              <div key={user.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-primary/10 text-primary text-sm">
                    {user.name[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">{user.name}</span>
                    {user.isHost && (
                      <Badge variant="default" className="text-xs bg-yellow-500 hover:bg-yellow-600">
                        <Crown className="w-3 h-3 mr-1" />
                        房主
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Wifi className="w-3 h-3" />
                      {user.latency}ms
                    </span>
                    <span className="truncate">{user.ip}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 操作按钮 */}
      <div className="grid grid-cols-2 gap-3">
        <Button
          size="lg"
          className="h-14 bg-green-600 hover:bg-green-700"
          onClick={() => setShowLaunchDialog(true)}
        >
          <Gamepad2 className="w-5 h-5 mr-2" />
          启动游戏
        </Button>
        <Button size="lg" variant="outline" className="h-14">
          <Share2 className="w-5 h-5 mr-2" />
          邀请好友
        </Button>
      </div>

      {/* 启动游戏弹窗 */}
      <Dialog open={showLaunchDialog} onOpenChange={setShowLaunchDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>启动程序</DialogTitle>
            <DialogDescription>
              选择要启动的游戏或程序路径
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="flex gap-2">
              <Input
                placeholder="程序路径..."
                value={launchPath}
                onChange={(e) => setLaunchPath(e.target.value)}
                className="flex-1"
              />
              <Button variant="outline" onClick={() => setLaunchPath("C:\\Games\\Game.exe")}>
                选择
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLaunchDialog(false)}>
              取消
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={() => setShowLaunchDialog(false)}
              disabled={!launchPath}
            >
              开始游戏
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
