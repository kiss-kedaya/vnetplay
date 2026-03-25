export type QQLoginResult = {
  success: boolean;
  nickname?: string;
  avatar?: string;
  qqUid?: string;
  accessToken?: string;
  error?: string;
};

export type QQLoginState = {
  isLoggedIn: boolean;
  nickname: string | null;
  avatar: string | null;
  qqUid: string | null;
};

const STORAGE_KEY = "vnetplay.qq-login";

// QQ登录配置
const QQ_CONFIG = {
  appId: "2491",
  appKey: "e67aed73acb100c2beaf6f9e62d03d29",
  baseUrl: "https://u.daib.cn/connect.php",
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
      console.warn("[QQ Login] Tauri API not available, falling back to window.open");
    } catch (error) {
      console.error("[QQ Login] Tauri window creation failed:", error);
    }
  }
  // Web 环境
  const win = window.open(url, "qq-login", "width=600,height=500,scrollbars=yes");
  return win !== null;
}

// 获取回调URL - 使用开发服务器地址
function getRedirectUri(): string {
  if (typeof window === "undefined") return "";

  // 开发环境：固定使用开发服务器地址
  // 注意：需要在 u.daib.cn 后台配置白名单
  const { hostname, port } = window.location;

  // 如果是 localhost，转换为 127.0.0.1
  let host = hostname;
  if (hostname === "localhost") {
    host = "127.0.0.1";
  }

  const portSuffix = port ? `:${port}` : "";
  return `http://${host}${portSuffix}/callback`;
}

// 处理QQ回调 - 用code换取用户信息
export async function handleQQCallback(code: string): Promise<QQLoginResult> {
  try {
    console.log("[QQ Login] Handling callback with code:", code?.substring(0, 10) + "...");
    
    const url = `${QQ_CONFIG.baseUrl}?act=callback&appid=${QQ_CONFIG.appId}&appkey=${QQ_CONFIG.appKey}&type=qq&code=${code}`;
    console.log("[QQ Login] Callback URL:", url);
    
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Accept": "application/json",
      },
    });
    
    const data = await response.json();
    console.log("[QQ Login] Callback response:", data);
    
    if (data.code === 0) {
      console.log("[QQ Login] Login successful:", data.nickname, data.faceimg);
      return {
        success: true,
        nickname: data.nickname,
        avatar: data.faceimg,
        qqUid: data.social_uid,
        accessToken: data.access_token,
      };
    }
    
    console.error("[QQ Login] Callback failed:", data.msg, data);
    return {
      success: false,
      error: data.msg || "登录失败",
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
  if (typeof window === "undefined") {
    return { isLoggedIn: false, nickname: null, avatar: null, qqUid: null };
  }
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const data = JSON.parse(stored);
      return {
        isLoggedIn: true,
        nickname: data.nickname,
        avatar: data.avatar,
        qqUid: data.qqUid,
      };
    }
  } catch (error) {
    console.error("Error reading QQ login state:", error);
  }
  
  return { isLoggedIn: false, nickname: null, avatar: null, qqUid: null };
}

export function saveQQLogin(result: QQLoginResult): void {
  if (typeof window === "undefined" || !result.success) {
    return;
  }
  
  const data = {
    nickname: result.nickname,
    avatar: result.avatar,
    qqUid: result.qqUid,
    accessToken: result.accessToken,
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

// 启动QQ登录 - 先调用API获取授权URL，然后在新窗口打开
export async function startQQLogin(): Promise<{ success: boolean; error?: string }> {
  // 保存当前页面状态，登录后返回
  sessionStorage.setItem("vnetplay.qq-login-return-page", window.location.pathname);
  
  // 获取回调URL
  const redirectUri = getRedirectUri();
  console.log("[QQ Login] Redirect URI:", redirectUri);
  
  // 调用API获取授权URL
  const apiUrl = `${QQ_CONFIG.baseUrl}?act=login&appid=${QQ_CONFIG.appId}&appkey=${QQ_CONFIG.appKey}&type=qq&redirect_uri=${encodeURIComponent(redirectUri)}`;
  console.log("[QQ Login] Fetching auth URL from API:", apiUrl);
  
  try {
    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        "Accept": "application/json",
      },
    });
    
    const data = await response.json();
    console.log("[QQ Login] API response:", data);
    
    if (data.code === 0 && data.url) {
      // 使用兼容方式打开授权页面
      const opened = await openExternalUrl(data.url);
      if (!opened) {
        return { success: false, error: "无法打开登录窗口，请允许弹窗" };
      }
      return { success: true };
    } else {
      return { success: false, error: data.msg || "获取授权链接失败" };
    }
  } catch (error) {
    console.error("[QQ Login] Error fetching auth URL:", error);
    return { success: false, error: "网络错误" };
  }
}
