export type Theme = "light" | "dark" | "system";

const STORAGE_KEY = "vnetplay.theme";

export function getStoredTheme(): Theme {
  if (typeof window === "undefined") {
    return "system";
  }
  
  const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
  if (stored === "light" || stored === "dark" || stored === "system") {
    return stored;
  }
  return "system";
}

export function saveTheme(theme: Theme): void {
  if (typeof window === "undefined") {
    return;
  }
  localStorage.setItem(STORAGE_KEY, theme);
}

export function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") {
    return "light";
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function resolveTheme(theme: Theme): "light" | "dark" {
  if (theme === "system") {
    return getSystemTheme();
  }
  return theme;
}

export function applyTheme(theme: Theme): void {
  if (typeof window === "undefined") {
    return;
  }
  
  const root = document.documentElement;
  const resolved = resolveTheme(theme);
  
  root.classList.remove("light", "dark");
  root.classList.add(resolved);
  
  // 更新meta标签
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute("content", resolved === "dark" ? "#0a0a0a" : "#ffffff");
  }
}

export function initializeTheme(): Theme {
  const theme = getStoredTheme();
  applyTheme(theme);
  return theme;
}

export function watchSystemTheme(callback: (theme: "light" | "dark") => void): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  
  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  
  const handler = (e: MediaQueryListEvent) => {
    callback(e.matches ? "dark" : "light");
  };
  
  mediaQuery.addEventListener("change", handler);
  
  return () => {
    mediaQuery.removeEventListener("change", handler);
  };
}
