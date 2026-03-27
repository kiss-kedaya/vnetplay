# VNetPlay

VNetPlay 是一个桌面优先的异地联机工具，目标不是做后台控制台，也不是做好友社交平台，而是把最常用的联机动作压缩成一条简单流程：

- 填服务器地址
- 创建房间，或查看已有房间
- 选择房间并加入
- 查看当前房间状态

当前产品主方向已经收口为：**只保留房间联机核心流程**。

## 当前状态

当前仓库已经打通以下能力：

- 房间创建
- 房间加入
- 房间密码校验
- 服务端房间列表
- 桌面端 start / stop / inspect 命令桥
- PID 存活检测与 stale pid 自动清理
- runtime duration 运行时长 telemetry
- 联机 / 网络 / 排障页 live 轮询刷新
- 本地联机事件时间线与最近动作记录
- 首页一键继续上次联机
- 服务端 recent action 历史接口与前端历史视图
- 排障页聚合服务端健康检查、本地 inspect 与房间快照
- 基于机器码的稳定设备身份
- GitHub Actions 前端 / 服务端 / 桌面构建
- GitHub Release 桌面多平台产物发布

当前 UI 也已经从早期 dashboard 方向逐步收口为更轻量的“联机工作台”：

- `联机` 是唯一主模式
- `网络 / 排障 / 设置` 已被降为辅助入口
- 首页即房间主工作台

## 仓库结构

- `app/`
  - React + TypeScript + Vite 前端
  - 负责首页联机工作台、房间交互、设置页、辅助页面
- `desktop/`
  - Tauri 桌面壳
  - Rust 命令层、本地状态、系统身份、n2n 相关运行逻辑
- `server/`
  - Rust + Axum 控制服务端
  - 提供房间、网络状态、recent action、heartbeat 等接口
- `docs/`
  - 架构文档、模块边界、计划文档

## 当前产品结构

### 1. 联机主流程
首页已经压缩成一条更短的操作路径：

1. 填服务器地址
2. 房主创建房间
3. 玩家查看房间并加入
4. 查看当前状态

### 2. 身份模型
当前产品不走账号体系，底层身份已经切换为：

- 显示层：用户名
- 唯一身份：机器码 `machine_id`

桌面端会提供：

- `system_username`
- `machine_id`
- `machine_label`

前端创建房间 / 加入房间时会把 `client_id=machineId` 传给服务端，服务端按 `client_id` 去重房间成员。

### 3. 服务端状态
当前服务端仍然是轻量原型结构：

- `Arc<Mutex<...>>` 内存状态
- JSON 文件落盘

这足够支撑当前原型和联调，但还不是最终成品级持久化方案。

## 本地启动

### 一条命令同时启动 server + app

在仓库根目录直接运行：

```powershell
.\dev.cmd
```

它会自动：

- 在新窗口启动 `server/cargo run`
- 在当前窗口启动 `app` 的 Vite dev server

### 启动 server

```powershell
Set-Location server
cargo run
```

默认监听：

- `http://127.0.0.1:9080`

如果要让局域网或公网其他设备访问，请在启动前设置：

```powershell
$env:VNETPLAY_BIND="0.0.0.0:9080"
cargo run
```

如果要启用一个简单的访问令牌保护所有 `/api/*` 接口，可再额外设置：

```powershell
$env:VNETPLAY_AUTH_TOKEN="your-demo-token"
```

前端 `设置` 页中的“访问令牌”要和这里保持一致，桌面端心跳也会复用这个令牌。

### 启动 app

```powershell
Set-Location app
npm install
npm run dev
```

如果 Windows 本机的 `npm` / `node` PATH 有问题，可直接在仓库根目录运行：

```powershell
scripts\windows\app-install.cmd
scripts\windows\app-dev.cmd dev
scripts\windows\app-build.cmd
```

或者在 `app/` 目录里直接运行：

```powershell
.\install.cmd
.\dev.cmd
.\build.cmd
```

### QQ 登录可选环境变量

如果需要给桌面包或非默认环境配置 QQ 登录，可以在启动前注入以下 Vite 环境变量：

- `VITE_QQ_APP_ID`
- `VITE_QQ_APP_KEY`
- `VITE_QQ_BASE_URL`
- `VITE_QQ_REDIRECT_URI`

其中 `VITE_QQ_REDIRECT_URI` 适合用于打包后的桌面环境，避免回调地址依赖当前页面 origin。

### 启动 desktop

```powershell
Set-Location desktop
npm install
npm run tauri
```

如果 Windows 本机执行 `npm run tauri` 提示找不到 `tauri`，可直接在仓库根目录运行：

```powershell
scripts\windows\desktop-install.cmd
scripts\windows\desktop-dev.cmd
```

或者在 `desktop/` 目录里直接运行：

```powershell
.\install.cmd
.\dev.cmd
.\build.cmd
.\tauri.cmd dev
```

### 本地构建

前端：

```powershell
Set-Location app
npm run build
```

服务端：

```powershell
Set-Location server
cargo build --locked
```

桌面端：

```powershell
Set-Location desktop
npm run build
```

Windows 本机整套检查也可以直接在仓库根目录运行：

```powershell
scripts\windows\check-all.cmd
```

## CI / Release

当前 GitHub Actions 已拆分为三条 workflow：

- `frontend`
  - `npm ci`
  - `npx tsc --noEmit`
  - `npm run build`
- `server`
  - `cargo fmt --check`
  - `cargo clippy --all-targets -- -D warnings`
  - `cargo build --locked`
- `desktop`
  - app `npm ci` + `tsc` + build
  - desktop Rust `fmt` + `clippy`
  - Tauri release build
  - tag / manual dispatch 时发布 GitHub Release

桌面 workflow 目前支持：

- `main` 分支 push 自动构建
- `v*` tag 发布 release
- `workflow_dispatch` 手动触发

## 当前已知短板

虽然主链路已经打通，但当前还存在这些短板：

- 自动化测试体系仍然偏薄
- README 与部分 docs 曾长期落后于真实实现
- 服务端持久化还是轻量原型方案
- 产品还可以继续压缩首屏和辅助入口

## 近期主线

当前最优先方向：

1. 把联机首页继续打磨成更直给的房间工作台
2. 保持 CI 质量门有效，防止回归
3. 逐步同步文档与实际产品方向

## 相关文档

- `docs/architecture.md`
- `docs/modules.md`
- `docs/ui-guidelines.md`
- `docs/superpowers/plans/2026-03-24-vnetplay-implementation.md`

## 说明

当前仓库已经不再以“高概念控制台”作为目标，而是以：

- 高效
- 小巧
- 直接
- 只做联机核心流程

作为后续演进方向。
