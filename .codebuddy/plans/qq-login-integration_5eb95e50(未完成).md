---
name: qq-login-integration
overview: 集成QQ登录功能，使用用户QQ昵称和头像作为软件中的用户名称和头像
todos:
  - id: create-qq-login-service
    content: 创建QQ登录服务模块 lib/auth/qqLogin.ts
    status: pending
  - id: extend-user-profile
    content: 扩展UserProfile类型，添加QQ登录字段
    status: pending
    dependencies:
      - create-qq-login-service
  - id: create-callback-page
    content: 创建OAuth回调页面 CallbackPage.tsx
    status: pending
    dependencies:
      - create-qq-login-service
  - id: update-settings-page
    content: 更新SettingsPage添加QQ登录按钮和用户信息显示
    status: pending
    dependencies:
      - extend-user-profile
  - id: update-sidebar-avatar
    content: 更新Sidebar和Bottombar显示QQ头像
    status: pending
    dependencies:
      - extend-user-profile
  - id: integrate-app-state
    content: 更新App.tsx集成QQ登录状态管理
    status: pending
    dependencies:
      - extend-user-profile
---

## 产品概述

为VNetPlay添加QQ登录功能，使用户能够通过QQ授权登录，并使用QQ昵称和头像替代系统默认的用户信息显示。

## 核心功能

- QQ OAuth授权登录（通过黎洛云聚合平台）
- 获取并显示QQ昵称和头像
- 登录状态持久化（localStorage）
- 登出/切换账号功能
- 在Sidebar、SettingsPage等位置显示QQ头像

## 技术栈

- 前端框架：React + TypeScript + Vite
- UI组件库：shadcn/ui
- 认证方式：OAuth 2.0（黎洛云聚合平台）
- 数据持久化：localStorage

## API集成方案

### QQ登录流程

1. **获取授权URL**：`GET https://u.daib.cn/connect.php?act=login&appid=2491&appkey=xxx&type=qq&redirect_uri=xxx`
2. **用户授权**：跳转到返回的QQ授权页面
3. **回调处理**：用户授权后跳转回 `redirect_uri?type=qq&code=xxx`
4. **获取用户信息**：`GET https://u.daib.cn/connect.php?act=callback&appid=2491&appkey=xxx&type=qq&code=xxx`

- 返回：`{ access_token, social_uid, faceimg, nickname, gender, ip }`

### 回调域名配置

- 开发环境：`http://127.0.0.1:4321/callback`
- 生产环境：`https://kedaya.xyz/callback`

## 实现架构

```
┌─────────────────────────────────────────────────────────────┐
│                        App.tsx                               │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐    │
│  │   Sidebar   │  │  SettingsPage │  │    RoomsPage    │    │
│  │  (QQ头像)   │  │  (QQ登录按钮) │  │    (QQ头像)     │    │
│  └─────────────┘  └──────────────┘  └──────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  lib/auth/qqLogin.ts                         │
│  - getAuthUrl(): 获取授权URL                                 │
│  - handleCallback(code): 处理回调，获取用户信息               │
│  - getStoredQQLogin(): 读取本地登录状态                       │
│  - saveQQLogin(): 保存登录状态                                │
│  - clearQQLogin(): 清除登录状态                               │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  lib/profile/userProfile.ts                  │
│  - 扩展UserProfile类型，添加qqLogin字段                       │
│  - nickname?: string (QQ昵称)                                │
│  - avatar?: string (QQ头像URL)                               │
│  - qqUid?: string (QQ唯一标识)                               │
└─────────────────────────────────────────────────────────────┘
```

## 目录结构

```
app/src/
├── lib/
│   ├── auth/
│   │   └── qqLogin.ts          # [NEW] QQ登录服务模块
│   └── profile/
│       └── userProfile.ts      # [MODIFY] 扩展UserProfile类型
├── pages/
│   ├── settings/
│   │   └── SettingsPage.tsx    # [MODIFY] 添加QQ登录按钮和用户信息显示
│   └── callback/
│       └── CallbackPage.tsx    # [NEW] OAuth回调处理页面
├── components/
│   └── layout/
│       ├── Sidebar.tsx         # [MODIFY] 显示QQ头像
│       └── Bottombar.tsx       # [MODIFY] 显示QQ头像
└── App.tsx                     # [MODIFY] 集成QQ登录状态管理
```

## 实现要点

1. **安全性**：APPKEY仅在前端使用（聚合平台允许），生产环境建议后端代理
2. **用户体验**：登录时打开新窗口/标签页，授权后自动关闭并刷新主页面
3. **状态同步**：使用localStorage和window.postMessage实现跨窗口通信
4. **头像显示**：优先显示QQ头像，无则显示默认头像（首字母）
5. **昵称显示**：优先显示QQ昵称，无则显示系统用户名