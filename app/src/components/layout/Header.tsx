import { Sun, Moon, Monitor, BookOpen, Copy, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Theme } from "@/lib/theme/theme";
import { getProfileIdentityLabel, type UserProfile } from "@/lib/profile/userProfile";

type NavItem = {
  key: string;
  label: string;
};

type HeaderProps = {
  navItems: NavItem[];
  activeKey: string;
  onSelectNav: (key: string) => void;
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  profile: UserProfile;
};

const themeIcons: Record<Theme, React.ReactNode> = {
  light: <Sun className="h-4 w-4" />,
  dark: <Moon className="h-4 w-4" />,
  system: <Monitor className="h-4 w-4" />,
};

const themeLabels: Record<Theme, string> = {
  light: "浅色",
  dark: "深色",
  system: "跟随系统",
};

export function Header({
  navItems,
  activeKey,
  onSelectNav,
  theme,
  onThemeChange,
  profile,
}: HeaderProps) {
  const initials = profile.username.charAt(0).toUpperCase();
  const identityLabel = getProfileIdentityLabel(profile);

  const handleCopyIdentifier = async () => {
    const identifier = profile.qqUid || (profile.machineId !== "unknown-machine" ? profile.machineId : identityLabel);
    await navigator.clipboard.writeText(identifier);
    toast.success("已复制当前标识");
  };
  
  return (
    <header className="app-header">
      <div className="header-inner">
        <div className="flex w-full flex-col gap-3 md:w-auto md:flex-row md:items-center md:gap-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
              <span className="font-bold text-sm">V</span>
            </div>
            <div className="min-w-0">
              <p className="text-base font-semibold leading-none">VNetPlay</p>
              <p className="mt-1 text-xs text-muted-foreground">虚拟局域网联机工作台</p>
            </div>
          </div>

          <nav className="tab-nav w-full md:w-auto" aria-label="主导航">
            {navItems.map((item) => (
              <button
                key={item.key}
                onClick={() => onSelectNav(item.key)}
                className={cn(
                  "tab-nav-item",
                  activeKey === item.key && "active"
                )}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex w-full items-center justify-between md:w-auto md:justify-end gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-10 w-10 rounded-2xl border border-border/60 bg-card/75">
                {themeIcons[theme]}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {(["light", "dark", "system"] as Theme[]).map((t) => (
                <DropdownMenuItem
                  key={t}
                  onClick={() => onThemeChange(t)}
                  className="flex items-center gap-2"
                >
                  {themeIcons[t]}
                  <span>{themeLabels[t]}</span>
                  {theme === t && (
                    <span className="ml-auto text-xs text-primary">✓</span>
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex min-w-0 items-center gap-3 rounded-2xl border border-border/60 bg-card/80 px-3 py-2 shadow-sm transition-colors hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <div className="min-w-0 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <p className="truncate text-sm font-medium">{profile.username}</p>
                    {profile.source === "qq" ? (
                      <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-300">
                        QQ
                      </span>
                    ) : null}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">{identityLabel}</p>
                </div>
                <Avatar className="h-9 w-9 shrink-0 border border-border/60">
                  <AvatarImage src={profile.qqAvatar} alt={profile.username} />
                  <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <div className="px-3 py-2">
                <p className="text-sm font-medium truncate">{profile.username}</p>
                <p className="mt-1 text-xs text-muted-foreground break-all">{identityLabel}</p>
              </div>
              <DropdownMenuItem onClick={() => onSelectNav("settings")} className="flex items-center gap-2">
                <Settings2 className="h-4 w-4" />
                <span>打开设置</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onSelectNav("guide")} className="flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                <span>查看教程</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => void handleCopyIdentifier()} className="flex items-center gap-2">
                <Copy className="h-4 w-4" />
                <span>复制当前标识</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
