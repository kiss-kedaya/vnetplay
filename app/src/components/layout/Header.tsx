import { Sun, Moon, Monitor } from "lucide-react";
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
import type { UserProfile } from "@/lib/profile/userProfile";

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
  
  return (
    <header className="app-header">
      <div className="header-inner">
        {/* 左侧：Logo + 导航 */}
        <div className="flex items-center gap-8">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">V</span>
            </div>
            <span className="font-semibold text-lg">VNetPlay</span>
          </div>
          
          {/* 标签页导航 */}
          <nav className="tab-nav">
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
        
        {/* 右侧：主题切换 + 用户头像 */}
        <div className="flex items-center gap-3">
          {/* 主题切换 */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9">
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
          
          {/* 用户头像 */}
          <Avatar className="h-8 w-8 cursor-pointer">
            <AvatarImage src={profile.qqAvatar} alt={profile.username} />
            <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
              {initials}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  );
}
