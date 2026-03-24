---
name: vnetplay-ui-optimization
overview: 基于"好朋友联机工具"参考UI风格，全面优化VNetPlay前端界面，采用现代化浅色主题、左侧深色导航、卡片式布局
design:
  architecture:
    framework: react
    component: shadcn
  styleKeywords:
    - Modern
    - Minimalist
    - Clean
    - Card-based
    - Dark Sidebar
    - Light Content
    - Rounded Corners
    - Subtle Shadows
  fontSystem:
    fontFamily: PingFang SC,Microsoft YaHei,sans-serif
    heading:
      size: 20px
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
      - "#22c55e"
      - "#111111"
    background:
      - "#f5f7fa"
      - "#ffffff"
      - "#1a1a1a"
    text:
      - "#1f2937"
      - "#6b7280"
      - "#ffffff"
    functional:
      - "#ef4444"
      - "#f59e0b"
      - "#10b981"
todos:
  - id: install-shadcn
    content: 安装shadcn/ui组件库及依赖(card/button/switch/badge/avatar等)
    status: completed
  - id: update-global-css
    content: 重构全局CSS样式，建立新配色变量系统
    status: completed
    dependencies:
      - install-shadcn
  - id: update-sidebar
    content: 重构Sidebar组件为深色主题，更新导航样式
    status: completed
    dependencies:
      - update-global-css
  - id: create-bottombar
    content: 新增Bottombar底部栏组件(用户/赞助/帮助/设置)
    status: completed
    dependencies:
      - update-global-css
  - id: update-topbar
    content: 重构Topbar组件，适配新配色和布局
    status: completed
    dependencies:
      - update-global-css
  - id: update-homepage
    content: 重构HomePage，大按钮卡片、房间列表新样式
    status: completed
    dependencies:
      - update-sidebar
      - create-bottombar
      - update-topbar
  - id: update-settingspage
    content: 重构SettingsPage，左侧子导航+分组设置卡片
    status: completed
    dependencies:
      - update-sidebar
      - create-bottombar
  - id: update-networkpage
    content: 重构NetworkPage，服务器列表+简洁表单
    status: completed
    dependencies:
      - update-sidebar
      - create-bottombar
  - id: update-diagnosticspage
    content: 重构DiagnosticsPage，诊断卡片+日志列表
    status: completed
    dependencies:
      - update-sidebar
      - create-bottombar
  - id: update-components
    content: 重构StatusPill/InfoCard等组件为shadcn风格
    status: completed
    dependencies:
      - install-shadcn
---

## 产品概述

VNetPlay联机工具UI优化，参考"好朋友联机工具"的现代化设计风格，提升视觉体验。

## 核心功能

- 首页：新建房间、加入房间、房间列表
- 网络：连接状态、服务器选择、线路信息
- 排障：诊断工具、日志查看
- 设置：服务器配置、用户名设置

## 参考UI设计要点

1. **配色**：浅灰背景(#f5f7fa) + 白色卡片 + 深色Sidebar + 蓝/绿色强调色
2. **布局**：顶部标题栏 + 左侧深色导航 + 右侧内容区 + 底部状态栏
3. **组件**：大圆角卡片(12-16px)、大型操作按钮、简洁Switch开关
4. **风格**：简洁、现代、层次分明、充足留白

## 技术栈

- **前端框架**: React + TypeScript + Vite
- **UI组件库**: shadcn/ui (基于Radix UI)
- **样式方案**: Tailwind CSS 3.4
- **图标**: lucide-react

## 实现策略

1. **配色系统重构**：从暖色调(金色/米色)迁移到冷色调(蓝/灰/白)
2. **组件替换**：使用shadcn/ui组件替换自定义组件(Switch、Button、Card等)
3. **布局调整**：新增Bottombar底部栏，调整Sidebar为深色主题
4. **样式统一**：建立CSS变量系统，确保全局一致性

## 关键优化点

- **性能**：使用CSS变量减少运行时计算
- **可维护性**：集中管理主题配置
- **响应式**：保持现有响应式布局

## 设计风格

采用"好朋友联机工具"的现代化设计语言：简洁、清晰、专业。

### 整体架构

- **窗口框架**：仿桌面应用风格，顶部标题栏含Logo和窗口控制
- **导航结构**：左侧深色Sidebar垂直导航，右侧主内容区
- **底部状态栏**：固定底部，左侧用户信息，右侧操作按钮

### 配色系统

- 背景：浅灰(#f5f7fa)提供柔和底色
- 卡片：纯白(#ffffff)带轻微阴影
- 导航：深色(#1a1a1a或#111111) Sidebar
- 强调：蓝色(#3b82f6)用于交互状态，绿色(#22c55e)用于成功状态
- 文字：深色(#1f2937)主文字，灰色(#6b7280)次要文字

### 组件风格

- 卡片：大圆角(16px)、轻微阴影(0 1px 3px rgba(0,0,0,0.1))
- 按钮：主按钮深色填充，次按钮描边样式
- 输入框：简洁边框，聚焦时蓝色高亮
- Switch：iOS风格，灰色/蓝色切换

### 页面布局

1. **首页**：顶部双大按钮(新建/加入)，中部房间列表卡片，底部状态栏
2. **设置页**：左侧深色子导航，右侧分组设置卡片
3. **网络页**：服务器列表单选，房间名输入，简洁操作按钮