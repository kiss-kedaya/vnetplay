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

          <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-border/60 bg-card/80 px-3 py-2 shadow-sm">
            <div className="min-w-0 text-right">
              <p className="truncate text-sm font-medium">{profile.username}</p>
              <p className="truncate text-xs text-muted-foreground">{profile.machineLabel}</p>
            </div>
            <Avatar className="h-9 w-9 shrink-0 cursor-pointer border border-border/60">
              <AvatarImage src={profile.qqAvatar} alt={profile.username} />
              <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                {initials}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
      </div>
    </header>
  );
}
