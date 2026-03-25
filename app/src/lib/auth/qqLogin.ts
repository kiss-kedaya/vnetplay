export type QQLoginResult = {
  success: boolean;
  nickname?: string;
  avatar?: string;
  qqUid?: string;
  syncId?: string;
  error?: string;
};

export type QQLoginState = {
  isLoggedIn: boolean;
  nickname: string | null;
  avatar: string | null;
  qqUid: string | null;
};

const STORAGE_KEY = "vnetplay.qq-login";
export const QQ_LOGIN_SYNC_STORAGE_KEY = "vnetplay.qq-login.sync";
export const QQ_LOGIN_SYNC_CHANNEL = "vnetplay.qq-login.channel";

type QQLoginRecord = {
  nickname: string;
  avatar: string;
  qqUid: string;
  loggedAt: string;
};

export type QQLoginSyncPayload = {
  success: true;
  nickname: string;
  avatar: string;
  qqUid: string;
  syncId: string;
  loggedAt: string;
};

const QQ_CONFIG = {
  appId: import.meta.env.VITE_QQ_APP_ID?.trim() || "2491",
  appKey: import.meta.env.VITE_QQ_APP_KEY?.trim() || "e67aed73acb100c2beaf6f9e62d03d29",
  baseUrl: import.meta.env.VITE_QQ_BASE_URL?.trim() || "https://u.daib.cn/connect.php",
  redirectUri: import.meta.env.VITE_QQ_REDIRECT_URI?.trim() || "",
};

// 检测是否在 Tauri 环境中
function isTauriEnv(): boolean {
  return typeof window !== "undefined" && "__TAURI__" in window;
}

// 打开外部链接（兼容 Tauri 和 Web）
async function openExternalUrl(url: string): Promise<boolean> {
  if (isTauriEnv()) {
    try {
      // Tauri v2: 使用 WebviewWindow 在应用内打开新窗口
      // @ts-ignore
      const tauri = window.__TAURI__;
      if (tauri?.webviewWindow?.WebviewWindow) {
        // @ts-ignore
        const webview = new tauri.webviewWindow.WebviewWindow("qq-login", {
          url: url,
          title: "QQ登录",
          width: 600,
          height: 500,
          center: true,
          resizable: true,
        });
        // 等待窗口创建
        await new Promise<void>((resolve) => {
          webview.once("tauri://created", () => resolve());
          webview.once("tauri://error", () => resolve());
        });
        return true;
      }
      // fallback: 使用 shell.open 在系统浏览器打开
      if (tauri?.shell?.open) {
        await tauri.shell.open(url);
        return true;
      }
    } catch (error) {
      console.error("[QQ Login] Tauri window creation failed:", error);
    }
  }
  // Web 环境
  const win = window.open(url, "qq-login", "width=600,height=500,scrollbars=yes");
  return win !== null;
}

function getRedirectUri(): string {
  if (QQ_CONFIG.redirectUri) {
    return QQ_CONFIG.redirectUri;
  }

  if (typeof window === "undefined") {
    return "";
  }

  const { protocol, hostname, port } = window.location;

  if (protocol !== "http:" && protocol !== "https:") {
    return "";
  }

  let host = hostname;
  if (hostname === "localhost") {
    host = "127.0.0.1";
  }

  const portSuffix = port ? `:${port}` : "";
  return `${protocol}//${host}${portSuffix}/callback`;
}

function readStoredQQLoginRecord(): QQLoginRecord | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return null;
    }

    const data = JSON.parse(stored) as Partial<QQLoginRecord>;
    if (!data.nickname || !data.qqUid) {
      return null;
    }

    return {
      nickname: String(data.nickname),
      avatar: String(data.avatar ?? ""),
      qqUid: String(data.qqUid),
      loggedAt: String(data.loggedAt ?? ""),
    };
  } catch {
    return null;
  }
}

function buildQQLoginSyncPayload(result: QQLoginResult): QQLoginSyncPayload | null {
  if (!result.success || !result.nickname || !result.qqUid) {
    return null;
  }

  return {
    success: true,
    nickname: result.nickname,
    avatar: result.avatar ?? "",
    qqUid: result.qqUid,
    syncId: result.syncId ?? `${Date.now()}-${result.qqUid}`,
    loggedAt: new Date().toISOString(),
  };
}

export function parseQQLoginSyncPayload(raw: string | null): QQLoginSyncPayload | null {
  if (!raw) {
    return null;
  }

  try {
    const data = JSON.parse(raw) as Partial<QQLoginSyncPayload>;
    if (!data.success || !data.nickname || !data.qqUid || !data.syncId) {
      return null;
    }

    return {
      success: true,
      nickname: String(data.nickname),
      avatar: String(data.avatar ?? ""),
      qqUid: String(data.qqUid),
      syncId: String(data.syncId),
      loggedAt: String(data.loggedAt ?? new Date().toISOString()),
    };
  } catch {
    return null;
  }
}

export function notifyQQLoginSuccess(result: QQLoginResult): QQLoginSyncPayload | null {
  if (typeof window === "undefined") {
    return null;
  }

  const payload = buildQQLoginSyncPayload(result);
  if (!payload) {
    return null;
  }

  try {
    localStorage.setItem(QQ_LOGIN_SYNC_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore storage sync failures and continue with best-effort messaging.
  }

  if (typeof BroadcastChannel !== "undefined") {
    try {
      const channel = new BroadcastChannel(QQ_LOGIN_SYNC_CHANNEL);
      channel.postMessage(payload);
      channel.close();
    } catch {
      // Ignore broadcast failures; other sync channels still exist.
    }
  }

  if (typeof window.opener !== "undefined" && window.opener && !window.opener.closed) {
    try {
      window.opener.postMessage({ type: "qq-login-success", payload }, window.location.origin);
    } catch {
      // Ignore opener messaging failures.
    }
  }

  return payload;
}

export async function handleQQCallback(code: string): Promise<QQLoginResult> {
  try {
    const params = new URLSearchParams({
      act: "callback",
      appid: QQ_CONFIG.appId,
      appkey: QQ_CONFIG.appKey,
      type: "qq",
      code,
    });

    const url = `${QQ_CONFIG.baseUrl}?${params.toString()}`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      return {
        success: false,
        error: `登录服务异常 (${response.status})`,
      };
    }

    const data = await response.json() as Record<string, unknown>;

    if (Number(data.code) === 0) {
      const nickname = String(data.nickname ?? "").trim();
      const avatar = String(data.faceimg ?? "");
      const qqUid = String(data.social_uid ?? "").trim();

      if (!nickname || !qqUid) {
        return {
          success: false,
          error: "登录结果不完整，请重试",
        };
      }

      return {
        success: true,
        nickname,
        avatar,
        qqUid,
        syncId: `${Date.now()}-${qqUid}`,
      };
    }

    return {
      success: false,
      error: String(data.msg ?? "登录失败"),
    };
  } catch (error) {
    console.error("[QQ Login] Error handling callback:", error);
    return {
      success: false,
      error: "网络错误",
    };
  }
}

export function getStoredQQLogin(): QQLoginState {
  const record = readStoredQQLoginRecord();
  return record
    ? {
        isLoggedIn: true,
        nickname: record.nickname,
        avatar: record.avatar || null,
        qqUid: record.qqUid,
      }
    : { isLoggedIn: false, nickname: null, avatar: null, qqUid: null };
}

export function saveQQLogin(result: QQLoginResult): void {
  if (typeof window === "undefined" || !result.success || !result.nickname || !result.qqUid) {
    return;
  }

  const data: QQLoginRecord = {
    nickname: result.nickname,
    avatar: result.avatar ?? "",
    qqUid: result.qqUid,
    loggedAt: new Date().toISOString(),
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function clearQQLogin(): void {
  if (typeof window === "undefined") {
    return;
  }
  localStorage.removeItem(STORAGE_KEY);
}

export async function startQQLogin(): Promise<{ success: boolean; error?: string }> {
  sessionStorage.setItem("vnetplay.qq-login-return-page", window.location.pathname);

  const redirectUri = getRedirectUri();
  if (!redirectUri) {
    return { success: false, error: "QQ 回调地址未配置，请设置 VITE_QQ_REDIRECT_URI" };
  }

  const params = new URLSearchParams({
    act: "login",
    appid: QQ_CONFIG.appId,
    appkey: QQ_CONFIG.appKey,
    type: "qq",
    redirect_uri: redirectUri,
  });
  const apiUrl = `${QQ_CONFIG.baseUrl}?${params.toString()}`;

  try {
    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      return { success: false, error: `获取授权链接失败 (${response.status})` };
    }

    const data = await response.json() as Record<string, unknown>;

    if (Number(data.code) === 0 && typeof data.url === "string") {
      const opened = await openExternalUrl(data.url);
      if (!opened) {
        return { success: false, error: "无法打开登录窗口，请允许弹窗" };
      }
      return { success: true };
    }

    return { success: false, error: String(data.msg ?? "获取授权链接失败") };
  } catch (error) {
    console.error("[QQ Login] Error fetching auth URL:", error);
    return { success: false, error: "网络错误" };
  }
}
