# VNetPlay Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a modular multi-platform LAN gaming client and control server using Rust + Tauri, optimized for n2n-based virtual LAN rooms, with a Vercel-inspired high-end minimal UI.

**Architecture:** The desktop client uses Tauri 2 with a React + TypeScript frontend and a Rust core that manages n2n edge processes, room state, and diagnostics. The server uses Rust with Axum as the control plane for authentication, room orchestration, node presence, and downloadable configuration. The network data plane remains on n2n so the product can ship quickly without building a custom VPN protocol.

**Tech Stack:** Tauri 2, Rust, React, TypeScript, Vite, TailwindCSS, Zustand, Axum, Tokio, PostgreSQL, GitHub Actions

---

## Chunk 1: Repository foundation

### Task 1: Create the mono-repo skeleton

**Files:**
- Create: `README.md`
- Create: `docs/superpowers/plans/2026-03-24-vnetplay-implementation.md`
- Create: `app/`
- Create: `desktop/`
- Create: `server/`
- Create: `.github/workflows/`

- [x] Define focused directories for app, desktop, and server.
- [x] Keep page and service boundaries small so files do not grow into maintenance hazards.
- [x] Add root documentation for architecture, setup, and roadmap.
- [x] Commit repository foundation.

### Task 2: Define UI and architecture rules

**Files:**
- Create: `docs/architecture.md`
- Create: `docs/ui-guidelines.md`
- Create: `docs/modules.md`

- [x] Lock Vercel-inspired UI principles: minimal, strong spacing, crisp borders, restrained color.
- [x] Document no-emoji policy and SVG/icon-only asset rule.
- [x] Document file size discipline and module split strategy.
- [x] Commit architecture documents.

## Chunk 2: Client shell

### Task 3: Scaffold React + TypeScript frontend

**Files:**
- Create: `app/package.json`
- Create: `app/tsconfig.json`
- Create: `app/vite.config.ts`
- Create: `app/src/main.tsx`
- Create: `app/src/App.tsx`

- [x] Create a frontend shell with React, TypeScript, Vite, and TailwindCSS.
- [x] Add layout primitives and icon system.
- [x] Create route skeletons for home, rooms, network, diagnostics, and settings.
- [x] Commit client shell.

### Task 4: Build the Vercel-style UI system

**Files:**
- Create: `app/src/components/layout/*.tsx`
- Create: `app/src/components/cards/*.tsx`
- Create: `app/src/components/status/*.tsx`
- Create: `app/src/components/icons/*.tsx`
- Create: `app/src/styles/*.css`

- [x] Implement shared panel, section, table, empty state, and toolbar primitives.
- [x] Use SVG-based icons only.
- [x] Keep each component focused and under a maintainable size.
- [x] Commit UI system.

## Chunk 3: Tauri desktop core

### Task 5: Scaffold desktop shell

**Files:**
- Create: `desktop/package.json`
- Create: `desktop/src-tauri/Cargo.toml`
- Create: `desktop/src-tauri/src/main.rs`
- Create: `desktop/src-tauri/tauri.conf.json`

- [x] Wire Tauri shell to the frontend build.
- [x] Create command, service, and state modules.
- [x] Prepare process management for n2n edge binaries.
- [x] Commit desktop shell.

### Task 6: Add Rust-side process and diagnostics modules

**Files:**
- Create: `desktop/src-tauri/src/network/edge_manager.rs`
- Create: `desktop/src-tauri/src/network/node_status.rs`
- Create: `desktop/src-tauri/src/network/route_probe.rs`
- Create: `desktop/src-tauri/src/game/detector.rs`

- [x] Implement structured process startup and shutdown for edge.
- [x] Add status parsing and diagnostics collection.
- [x] Add future game detector module boundaries.
- [x] Commit network core modules.

## Chunk 4: Server foundation

### Task 7: Scaffold Rust control server

**Files:**
- Create: `server/Cargo.toml`
- Create: `server/src/main.rs`
- Create: `server/src/api/router.rs`
- Create: `server/src/config/mod.rs`

- [x] Create Axum server shell.
- [x] Add health endpoint and config loader.
- [x] Create modular feature folders for auth, rooms, nodes, and telemetry.
- [x] Commit server shell.

### Task 8: Add room and node API boundaries

**Files:**
- Create: `server/src/rooms/*.rs`
- Create: `server/src/nodes/*.rs`
- Create: `server/src/models/*.rs`

- [x] Define room lifecycle and node heartbeat models.
- [x] Define config payloads for n2n clients.
- [x] Keep handlers separate from domain logic.
- [x] Commit API boundaries.

## Chunk 5: Delivery pipeline

### Task 9: Add GitHub Actions

**Files:**
- Create: `.github/workflows/frontend.yml`
- Create: `.github/workflows/server.yml`
- Create: `.github/workflows/desktop.yml`

- [x] Add lint/build/test checks for frontend.
- [x] Add cargo fmt/clippy/test for server and desktop.
- [x] Keep workflows split by responsibility.
- [x] Commit CI.

### Task 10: Publish repository metadata

**Files:**
- Create: `.gitignore`
- Create: `LICENSE`
- Create: `.github/ISSUE_TEMPLATE/bug_report.yml`
- Create: `.github/ISSUE_TEMPLATE/feature_request.yml`

- [x] Prepare public-repo basics.
- [x] Add contribution-facing metadata.
- [x] Commit repo metadata.

## Live progress
- [x] Repository scaffold, docs, public GitHub repo, and Actions baseline completed.
- [x] Frontend shell is buildable and follows the Vercel-inspired modular dashboard direction.
- [x] Rust control server exposes `/health`, `/api/dashboard/summary`, `/api/rooms`, `/api/network/status`, and `/api/nodes/heartbeat`.
- [x] Desktop Rust shell compiles with n2n-related module boundaries in place.
- [x] Frontend rooms and network pages now fetch real server-backed data.
- [x] Server room list, network status, dashboard summary, and heartbeat ingestion now share one in-memory state source.
- [x] Server state now supports local JSON persistence for rooms and heartbeat snapshots.
- [x] Desktop command layer now has callable start and inspect boundaries instead of a single placeholder summary.
- [x] Desktop process service now supports start/stop process management boundaries with PID tracking.
- [x] Frontend network page now has a desktop bridge abstraction and control buttons for inspect/start/stop flows.
- [x] GitHub Actions has been upgraded to multi-platform frontend/server/desktop matrix workflows.
- [x] Desktop has been upgraded to a real Tauri app shell with local debug build success.
- [x] GitHub Actions Tauri desktop matrix is now green across Windows, macOS, and Ubuntu.
- [x] App startup now reads the current system username through the desktop bridge and surfaces it in the UI.
- [x] Settings page now allows overriding the display username and resetting back to the detected system username.
- [x] Rooms page now supports creating a room and joining an existing room against the live Rust server API.
- [x] Current username is now written into room participant lists when creating or joining a room.
- [x] Settings page now supports editing the server base URL and default room name with local persistence.
- [x] Frontend dashboard, rooms, and network API calls now share the configured server base URL.
- [x] Rooms page create flow now defaults to the configured default room name.
- [x] Home page now supports quick create and quick join actions using the current username, configured server base URL, and default room name.
- [x] Network page start action now passes the current username and configured default room into the desktop bridge.
- [x] Desktop Tauri command/state layer now tracks active room and current username for network startup and command inspection.
- [x] Settings page now supports an auto-connect-on-launch toggle for the network page.
- [x] Network page now shows a startup context preview card and can auto-start the network flow once per page load when enabled.
- [x] Frontend now persists the latest connection context and reuses it across the home and network pages.
- [x] Home page now shows the latest connection context and recent command result summary.
- [x] Settings page now supports editing default community and supernode address.
- [x] Desktop network startup payload now carries community and supernode into the Rust command/service layer.
- [x] Desktop workflow now uploads downloadable bundled artifacts for each platform build.
- [x] Desktop package now exposes local release and portable build scripts for Windows standalone executable output.
- [x] Local Windows release bundling now succeeds and emits `target/release/vnetplay-desktop.exe`, `.msi`, and NSIS setup `.exe` outputs.
- [ ] Next pass: replace remaining browser bridge fallbacks with wider real invoke usage, harden error handling, improve persistence robustness, and continue turning the shell into an end-to-end usable LAN client.
