import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { handleQQCallback, saveQQLogin, type QQLoginResult } from "@/lib/auth/qqLogin";

type CallbackStatus = "loading" | "success" | "error";

// 检测是否在 Tauri 环境中
function isTauriEnv(): boolean {
  return typeof window !== "undefined" && "__TAURI__" in window;
}

// 获取当前窗口信息（Tauri）
async function getTauriWindowInfo(): Promise<{ label: string; window: any } | null> {
  if (!isTauriEnv()) return null;
  try {
    // @ts-ignore
    const tauri = window.__TAURI__;
    // Tauri v2 API
    if (tauri?.webviewWindow?.getCurrentWebviewWindow) {
      const win = tauri.webviewWindow.getCurrentWebviewWindow();
      const label = await win.label();
      return { label, window: win };
    }
  } catch (error) {
    console.error("[QQ Callback] getTauriWindowInfo error:", error);
  }
  return null;
}

export function CallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<CallbackStatus>("loading");
  const [error, setError] = useState<string>("");
  const [nickname, setNickname] = useState<string>("");

  useEffect(() => {
    const code = searchParams.get("code");
    const type = searchParams.get("type");
    const state = searchParams.get("state");

    // 调试：打印所有参数
    console.log("[QQ Callback] === START ===");
    console.log("[QQ Callback] Full URL:", window.location.href);
    console.log("[QQ Callback] Search:", window.location.search);
    console.log("[QQ Callback] Params:", { code, type, state });
    console.log("[QQ Callback] All params:", Object.fromEntries(searchParams.entries()));

    // 只需要有 code 参数即可
    if (!code) {
      console.error("[QQ Callback] No code parameter found");
      setStatus("error");
      setError(`无效的回调参数：缺少 code。URL: ${window.location.href}`);
      return;
    }

    console.log("[QQ Callback] Calling handleQQCallback with code:", code.substring(0, 10) + "...");

    handleQQCallback(code)
      .then(async (result: QQLoginResult) => {
        console.log("[QQ Callback] handleQQCallback result:", result);
        
        if (result.success) {
          saveQQLogin(result);
          setNickname(result.nickname || "");
          setStatus("success");

          // 检查是否在 Tauri 登录窗口中
          const windowInfo = await getTauriWindowInfo();
          console.log("[QQ Callback] Tauri window info:", windowInfo);
          
          if (windowInfo && windowInfo.label === "qq-login") {
            // 在登录窗口中，等待后关闭窗口
            setTimeout(async () => {
              try {
                // @ts-ignore
                const tauri = window.__TAURI__;
                
                // 使用 emitTo 向主窗口发送事件
                if (tauri?.event?.emitTo) {
                  console.log("[QQ Callback] Emitting event to main window...");
                  await tauri.event.emitTo("main", "qq-login-success", {
                    nickname: result.nickname,
                    avatar: result.avatar,
                    qqUid: result.qqUid,
                    accessToken: result.accessToken,
                  });
                  console.log("[QQ Callback] Event emitted successfully");
                } else if (tauri?.event?.emit) {
                  // fallback: 广播事件
                  console.log("[QQ Callback] Broadcasting event...");
                  await tauri.event.emit("qq-login-success", {
                    nickname: result.nickname,
                    avatar: result.avatar,
                    qqUid: result.qqUid,
                    accessToken: result.accessToken,
                  });
                }
                
                // 关闭当前窗口
                console.log("[QQ Callback] Closing login window...");
                await windowInfo.window.close();
              } catch (err) {
                console.error("[QQ Callback] Close window error:", err);
                // 即使出错也尝试关闭
                try {
                  await windowInfo.window.close();
                } catch (e) {
                  console.error("[QQ Callback] Force close failed:", e);
                }
              }
            }, 1500);
            return;
          }

          // Web 环境或主窗口：跳转回主页面
          setTimeout(() => {
            navigate("/?refresh=qq-login", { replace: true });
          }, 1500);
        } else {
          console.error("[QQ Callback] handleQQCallback failed:", result.error);
          setStatus("error");
          setError(result.error || "登录失败");
        }
      })
      .catch((err) => {
        console.error("[QQ Callback] Error:", err);
        setStatus("error");
        setError("网络错误，请重试: " + (err instanceof Error ? err.message : String(err)));
      });
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4 p-8 max-w-md">
        {status === "loading" && (
          <>
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
            <h2 className="text-lg font-medium">正在登录...</h2>
            <p className="text-sm text-muted-foreground">请稍候，正在获取您的QQ信息</p>
          </>
        )}

        {status === "success" && (
          <>
            <CheckCircle className="h-12 w-12 mx-auto text-green-500" />
            <h2 className="text-lg font-medium">登录成功！</h2>
            <p className="text-sm text-muted-foreground">
              欢迎，{nickname}！
            </p>
          </>
        )}

        {status === "error" && (
          <>
            <XCircle className="h-12 w-12 mx-auto text-destructive" />
            <h2 className="text-lg font-medium">登录失败</h2>
            <p className="text-sm text-muted-foreground">{error}</p>
            <button
              onClick={async () => {
                const windowInfo = await getTauriWindowInfo();
                if (windowInfo) {
                  await windowInfo.window.close();
                } else {
                  navigate("/", { replace: true });
                }
              }}
              className="mt-4 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              关闭
            </button>
          </>
        )}
      </div>
    </div>
  );
}
