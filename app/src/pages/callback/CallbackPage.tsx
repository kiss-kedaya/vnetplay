import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { handleQQCallback, saveQQLogin, type QQLoginResult } from "@/lib/auth/qqLogin";

type CallbackStatus = "loading" | "success" | "error";

// 检测是否在 Tauri 环境中
function isTauriEnv(): boolean {
  return typeof window !== "undefined" && "__TAURI__" in window;
}

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

async function closeLoginWindow() {
  const windowInfo = await getTauriWindowInfo();
  if (windowInfo) {
    await windowInfo.window.close();
    return true;
  }

  return false;
}

export function CallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<CallbackStatus>("loading");
  const [error, setError] = useState<string>("");
  const [nickname, setNickname] = useState<string>("");

  useEffect(() => {
    const code = searchParams.get("code");

    if (!code) {
      setStatus("error");
      setError("无效的回调参数：缺少授权 code");
      return;
    }

    handleQQCallback(code)
      .then(async (result: QQLoginResult) => {
        if (result.success) {
          saveQQLogin(result);
          setNickname(result.nickname || "");
          setStatus("success");

          const windowInfo = await getTauriWindowInfo();

          if (windowInfo && windowInfo.label === "qq-login") {
            setTimeout(async () => {
              try {
                // @ts-ignore
                const tauri = window.__TAURI__;

                if (tauri?.event?.emitTo) {
                  await tauri.event.emitTo("main", "qq-login-success", {
                    success: true,
                    nickname: result.nickname,
                    avatar: result.avatar,
                    qqUid: result.qqUid,
                  });
                } else if (tauri?.event?.emit) {
                  await tauri.event.emit("qq-login-success", {
                    success: true,
                    nickname: result.nickname,
                    avatar: result.avatar,
                    qqUid: result.qqUid,
                  });
                }

                await closeLoginWindow();
              } catch (err) {
                console.error("[QQ Callback] Close window error:", err);
                try {
                  await closeLoginWindow();
                } catch (e) {
                  console.error("[QQ Callback] Force close failed:", e);
                }
              }
            }, 1500);
            return;
          }

          setTimeout(() => {
            navigate("/?refresh=qq-login", { replace: true });
          }, 1500);
        } else {
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
                const closed = await closeLoginWindow();
                if (!closed) {
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
