import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { handleQQCallback, saveQQLogin, type QQLoginResult } from "@/lib/auth/qqLogin";

type CallbackStatus = "loading" | "success" | "error";

// 检测是否在 Tauri 环境中
function isTauriEnv(): boolean {
  return typeof window !== "undefined" && "__TAURI__" in window;
}

// 获取当前窗口（Tauri）
async function getCurrentTauriWindow() {
  if (!isTauriEnv()) return null;
  // @ts-ignore
  const tauri = window.__TAURI__;
  if (tauri?.webviewWindow?.getCurrentWebviewWindow) {
    return tauri.webviewWindow.getCurrentWebviewWindow();
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

    console.log("[QQ Callback] Params:", { code: code?.substring(0, 10), type });

    if (!code || type !== "qq") {
      setStatus("error");
      setError("无效的回调参数");
      return;
    }

    handleQQCallback(code)
      .then(async (result: QQLoginResult) => {
        if (result.success) {
          saveQQLogin(result);
          setNickname(result.nickname || "");
          setStatus("success");

          // 检查是否在 Tauri 登录窗口中
          const tauriWindow = await getCurrentTauriWindow();
          if (tauriWindow) {
            const label = await tauriWindow.label();
            console.log("[QQ Callback] Tauri window label:", label);
            if (label === "qq-login") {
              // 在登录窗口中，等待1秒后关闭窗口
              setTimeout(async () => {
                // 发送事件通知主窗口刷新
                // @ts-ignore
                const tauri = window.__TAURI__;
                if (tauri?.event?.emit) {
                  await tauri.event.emit("qq-login-success", { nickname: result.nickname });
                }
                // 关闭当前窗口
                await tauriWindow.close();
              }, 1500);
              return;
            }
          }

          // Web 环境：跳转回主页面
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
        setError("网络错误，请重试");
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
                const tauriWindow = await getCurrentTauriWindow();
                if (tauriWindow) {
                  await tauriWindow.close();
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
