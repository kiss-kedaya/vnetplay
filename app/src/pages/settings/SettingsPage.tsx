import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  User,
  Server,
  LogOut,
  Info,
  ExternalLink,
  Loader2,
  HelpCircle,
} from "lucide-react";
import type { UserProfile } from "../../lib/profile/userProfile";
import type { AppSettings } from "../../lib/settings/appSettings";
import type { QQLoginState } from "../../lib/auth/qqLogin";
import { startQQLogin, clearQQLogin } from "../../lib/auth/qqLogin";

type SettingsPageProps = {
  profile: UserProfile;
  settings: AppSettings;
  onSaveSettings: (input: Partial<AppSettings>) => void;
  qqLogin: QQLoginState;
  onQQLoginChange: () => void;
};

export function SettingsPage({
  profile,
  settings,
  onSaveSettings,
  qqLogin,
  onQQLoginChange,
}: SettingsPageProps) {
  const [serverBaseUrl, setServerBaseUrl] = useState(settings.serverBaseUrl);
  const [defaultRoomName, setDefaultRoomName] = useState(settings.defaultRoomName);
  const [supernodeAddress, setSupernodeAddress] = useState(settings.supernodeAddress);
  const [autoConnectOnLaunch, setAutoConnectOnLaunch] = useState(settings.autoConnectOnLaunch);
  const [qqLoginLoading, setQQLoginLoading] = useState(false);

  useEffect(() => {
    setServerBaseUrl(settings.serverBaseUrl);
    setDefaultRoomName(settings.defaultRoomName);
    setSupernodeAddress(settings.supernodeAddress);
    setAutoConnectOnLaunch(settings.autoConnectOnLaunch);
  }, [settings.serverBaseUrl, settings.defaultRoomName, settings.supernodeAddress, settings.autoConnectOnLaunch]);

  const handleQQLogin = async () => {
    setQQLoginLoading(true);
    try {
      const result = await startQQLogin();
      if (!result.success) {
        toast.error(result.error || "登录失败");
      } else {
        toast.success("请在弹出的窗口中完成QQ授权");
      }
    } catch (error) {
      toast.error("登录出错");
    } finally {
      setQQLoginLoading(false);
    }
  };

  const handleQQLogout = () => {
    clearQQLogin();
    onQQLoginChange();
    toast.success("已退出QQ登录");
  };

  const handleSaveServerSettings = () => {
    onSaveSettings({
      serverBaseUrl,
      defaultRoomName,
      supernodeAddress,
      autoConnectOnLaunch,
    });
    toast.success("设置已保存");
  };

  return (
    <div className="space-y-6">
      {/* 用户信息 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <User className="w-4 h-4" />
            用户信息
          </CardTitle>
          <CardDescription>管理您的账户和显示信息</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* QQ登录区域 */}
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={profile.qqAvatar} alt={profile.username} />
              <AvatarFallback className="bg-primary/10 text-primary text-xl">
                {profile.username.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-lg font-medium">{profile.username}</span>
                {qqLogin.isLoggedIn && (
                  <span className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2 py-0.5 rounded-full">
                    QQ已登录
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {qqLogin.isLoggedIn
                  ? `QQ: ${qqLogin.nickname}`
                  : profile.source === "system"
                    ? "使用系统用户名"
                    : "使用自定义用户名"}
              </p>
            </div>
          </div>

          {/* QQ登录按钮 */}
          {qqLogin.isLoggedIn ? (
            <Button
              variant="outline"
              className="w-full"
              onClick={handleQQLogout}
            >
              <LogOut className="w-4 h-4 mr-2" />
              退出QQ登录
            </Button>
          ) : (
            <Button
              className="w-full bg-[#12B7F5] hover:bg-[#12B7F5]/90"
              onClick={handleQQLogin}
              disabled={qqLoginLoading}
            >
              {qqLoginLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <ExternalLink className="w-4 h-4 mr-2" />
              )}
              {qqLoginLoading ? "正在跳转..." : "使用QQ登录"}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* 服务器设置 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Server className="w-4 h-4" />
            服务器设置
          </CardTitle>
          <CardDescription>配置连接参数</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-1">
              <Label htmlFor="server-url">服务器地址</Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>VNetPlay后端服务的HTTP地址</p>
                  <p className="text-xs text-muted-foreground">格式: http://IP:端口</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <Input
              id="server-url"
              placeholder="http://127.0.0.1:9080"
              value={serverBaseUrl}
              onChange={(e) => setServerBaseUrl(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">默认连接本机服务，如需连接远程服务器请修改此项</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-1">
                <Label htmlFor="room-name">默认房间名</Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>创建或加入房间时的默认名称</p>
                    <p className="text-xs text-muted-foreground">支持字母、数字、下划线</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Input
                id="room-name"
                placeholder="my-room"
                value={defaultRoomName}
                onChange={(e) => setDefaultRoomName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-1">
                <Label htmlFor="supernode">Supernode</Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>N2N超级节点地址</p>
                    <p className="text-xs text-muted-foreground">格式: IP:端口</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Input
                id="supernode"
                placeholder="127.0.0.1:7777"
                value={supernodeAddress}
                onChange={(e) => setSupernodeAddress(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <div>
              <Label>自动连接</Label>
              <p className="text-xs text-muted-foreground">进入网络页面时自动连接</p>
            </div>
            <Switch
              checked={autoConnectOnLaunch}
              onCheckedChange={setAutoConnectOnLaunch}
            />
          </div>

          <Button className="w-full" onClick={handleSaveServerSettings}>
            保存设置
          </Button>
        </CardContent>
      </Card>

      {/* 关于 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Info className="w-4 h-4" />
            关于
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">V</span>
            </div>
            <div>
              <h3 className="font-semibold">VNetPlay</h3>
              <p className="text-sm text-muted-foreground">虚拟局域网联机工具 · v1.0.0</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
