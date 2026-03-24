---
name: ui-redesign-and-qq-login
overview: 重构VNetPlay UI为Vercel/ChatGPT风格白色简约设计（移除侧边栏、简化页面、添加日夜主题）+ 集成QQ登录
design:
  architecture:
    framework: react
    component: shadcn
  styleKeywords:
    - Minimalism
    - White
    - Dark-mode
    - Centered-layout
    - Card-based
  fontSystem:
    fontFamily: Inter
    heading:
      size: 24px
      weight: 600
    subheading:
      size: 16px
      weight: 500
    body:
      size: 14px
      weight: 400
  colorSystem:
    primary:
      - "#3b82f6"
      - "#2563eb"
    background:
      - "#ffffff"
      - "#f9fafb"
      - "#0a0a0a"
      - "#171717"
    text:
      - "#111827"
      - "#6b7280"
      - "#fafafa"
      - "#a1a1aa"
    functional:
      - "#22c55e"
      - "#ef4444"
      - "#f59e0b"
todos:
  - id: setup-dark-mode
    content: 配置Tailwind dark mode和CSS变量（浅色/深色主题）
    status: completed
  - id: create-theme-service
    content: 创建主题管理服务 lib/theme/theme.ts
    status: completed
    dependencies:
      - setup-dark-mode
  - id: create-qq-login-service
    content: 创建QQ登录服务 lib/auth/qqLogin.ts
    status: completed
  - id: extend-user-profile
    content: 扩展UserProfile类型，添加QQ头像和昵称字段
    status: completed
    dependencies:
      - create-qq-login-service
  - id: create-header-component
    content: 创建顶部导航组件 Header.tsx（Logo + 标签页 + 主题切换 + 用户头像）
    status: completed
    dependencies:
      - setup-dark-mode
  - id: create-callback-page
    content: 创建OAuth回调页面 CallbackPage.tsx
    status: completed
    dependencies:
      - create-qq-login-service
  - id: refactor-app-layout
    content: 重构App.tsx，移除Sidebar，使用新Header布局
    status: completed
    dependencies:
      - create-header-component
  - id: simplify-homepage
    content: 简化HomePage为创建/加入房间两个大按钮
    status: completed
    dependencies:
      - refactor-app-layout
  - id: simplify-roomspage
    content: 简化RoomsPage布局，居中卡片风格
    status: completed
    dependencies:
      - refactor-app-layout
  - id: update-settings-page
    content: 更新SettingsPage添加QQ登录和主题切换
    status: completed
    dependencies:
      - create-qq-login-service
      - extend-user-profile
  - id: remove-legacy-components
    content: 移除Sidebar、Bottombar旧组件
    status: completed
    dependencies:
      - refactor-app-layout
---

## 产品概述

重构VNetPlay应用UI，采用Vercel/ChatGPT风格的简约白色设计，集成QQ登录功能，使用户能够使用QQ昵称和头像。

## 核心功能

- **UI布局重构**：移除侧边栏，改为居中布局的标签页导航
- **日夜主题**：支持跟随系统的深色/浅色主题切换
- **QQ登录**：通过黎洛云聚合平台OAuth授权，获取QQ昵称和头像
- **页面简化**：每页专注1-2个核心功能

## 设计风格

- Vercel风格：大量留白、黑白配色、圆角卡片
- ChatGPT风格：居中布局、标签页导航、简洁表单

## 技术栈

- 前端框架：React + TypeScript + Vite
- UI组件库：shadcn/ui
- 样式：Tailwind CSS + dark mode
- 认证：OAuth 2.0（黎洛云聚合平台）

## 实现方案

### 1. 布局重构

```
新布局结构：
┌─────────────────────────────────────────────────────────────┐
│  VNetPlay    [联机] [房间] [设置]    🌙  [QQ头像]         │  <- 顶部导航
├─────────────────────────────────────────────────────────────┤
│                                                             │
│              页面内容（居中，max-width: 800px）              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 2. 日夜主题

- 使用Tailwind CSS `dark:` 变体
- 跟随系统偏好 `prefers-color-scheme`
- 支持手动切换，存储到localStorage

### 3. QQ登录API

- APPID: 2491
- 回调地址: `http://127.0.0.1:5173/callback`（开发）/ `https://kedaya.xyz/callback`（生产）
- 流程：获取授权URL → 用户授权 → 回调处理 → 获取用户信息

### 4. 目录结构

```
app/src/
├── lib/
│   ├── auth/
│   │   └── qqLogin.ts          # [NEW] QQ登录服务
│   ├── theme/
│   │   └── theme.ts            # [NEW] 主题管理
│   └── profile/
│       └── userProfile.ts      # [MODIFY] 添加QQ字段
├── components/
│   ├── layout/
│   │   ├── Header.tsx          # [NEW] 顶部导航栏
│   │   └── TabNav.tsx          # [NEW] 标签页导航
│   └── ui/                     # shadcn组件
├── pages/
│   ├── home/
│   │   └── HomePage.tsx        # [MODIFY] 简化为创建/加入房间
│   ├── rooms/
│   │   └── RoomsPage.tsx       # [MODIFY] 简化布局
│   ├── settings/
│   │   └── SettingsPage.tsx    # [MODIFY] QQ登录+基础设置
│   └── callback/
│       └── CallbackPage.tsx    # [NEW] OAuth回调页
├── App.tsx                     # [MODIFY] 新布局
└── styles/
    └── index.css               # [MODIFY] 添加dark mode变量
```

### 5. 页面功能划分

| 页面 | 核心功能 |
| --- | --- |
| 联机 | 创建房间、加入房间（两个大按钮） |
| 房间 | 成员列表、启动游戏、退出房间 |
| 设置 | QQ登录、主题切换、基础配置 |


## 设计风格

采用Vercel/ChatGPT风格的简约白色设计，强调留白、清晰层次和舒适阅读体验。

## 布局特点

- **居中布局**：内容区域max-width 800px，水平居中
- **标签页导航**：顶部水平导航，类似ChatGPT
- **大量留白**：卡片间距充足，视觉轻松
- **圆角卡片**：统一使用rounded-xl/2xl

## 浅色主题

- 背景：#ffffff / #f9fafb
- 卡片：#ffffff + 细边框
- 文字：#111827 / #6b7280
- 强调：#3b82f6（蓝色）

## 深色主题

- 背景：#0a0a0a / #171717
- 卡片：#171717 + 边框
- 文字：#fafafa / #a1a1aa
- 强调：#60a5fa（蓝色）

## SubAgent

- **code-explorer**
- Purpose: 探索现有组件结构和样式模式，确保新设计与现有代码风格一致
- Expected outcome: 确认shadcn组件使用方式和Tailwind配置