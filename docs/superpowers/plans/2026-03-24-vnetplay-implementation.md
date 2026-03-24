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

- [ ] Define focused directories for app, desktop, and server.
- [ ] Keep page and service boundaries small so files do not grow into maintenance hazards.
- [ ] Add root documentation for architecture, setup, and roadmap.
- [ ] Commit repository foundation.

### Task 2: Define UI and architecture rules

**Files:**
- Create: `docs/architecture.md`
- Create: `docs/ui-guidelines.md`
- Create: `docs/modules.md`

- [ ] Lock Vercel-inspired UI principles: minimal, strong spacing, crisp borders, restrained color.
- [ ] Document no-emoji policy and SVG/icon-only asset rule.
- [ ] Document file size discipline and module split strategy.
- [ ] Commit architecture documents.

## Chunk 2: Client shell

### Task 3: Scaffold React + TypeScript frontend

**Files:**
- Create: `app/package.json`
- Create: `app/tsconfig.json`
- Create: `app/vite.config.ts`
- Create: `app/src/main.tsx`
- Create: `app/src/App.tsx`

- [ ] Create a frontend shell with React, TypeScript, Vite, and TailwindCSS.
- [ ] Add layout primitives and icon system.
- [ ] Create route skeletons for home, rooms, network, diagnostics, and settings.
- [ ] Commit client shell.

### Task 4: Build the Vercel-style UI system

**Files:**
- Create: `app/src/components/layout/*.tsx`
- Create: `app/src/components/cards/*.tsx`
- Create: `app/src/components/status/*.tsx`
- Create: `app/src/components/icons/*.tsx`
- Create: `app/src/styles/*.css`

- [ ] Implement shared panel, section, table, empty state, and toolbar primitives.
- [ ] Use SVG-based icons only.
- [ ] Keep each component focused and under a maintainable size.
- [ ] Commit UI system.

## Chunk 3: Tauri desktop core

### Task 5: Scaffold desktop shell

**Files:**
- Create: `desktop/package.json`
- Create: `desktop/src-tauri/Cargo.toml`
- Create: `desktop/src-tauri/src/main.rs`
- Create: `desktop/src-tauri/tauri.conf.json`

- [ ] Wire Tauri shell to the frontend build.
- [ ] Create command, service, and state modules.
- [ ] Prepare process management for n2n edge binaries.
- [ ] Commit desktop shell.

### Task 6: Add Rust-side process and diagnostics modules

**Files:**
- Create: `desktop/src-tauri/src/network/edge_manager.rs`
- Create: `desktop/src-tauri/src/network/node_status.rs`
- Create: `desktop/src-tauri/src/network/route_probe.rs`
- Create: `desktop/src-tauri/src/game/detector.rs`

- [ ] Implement structured process startup and shutdown for edge.
- [ ] Add status parsing and diagnostics collection.
- [ ] Add future game detector module boundaries.
- [ ] Commit network core modules.

## Chunk 4: Server foundation

### Task 7: Scaffold Rust control server

**Files:**
- Create: `server/Cargo.toml`
- Create: `server/src/main.rs`
- Create: `server/src/api/router.rs`
- Create: `server/src/config/mod.rs`

- [ ] Create Axum server shell.
- [ ] Add health endpoint and config loader.
- [ ] Create modular feature folders for auth, rooms, nodes, and telemetry.
- [ ] Commit server shell.

### Task 8: Add room and node API boundaries

**Files:**
- Create: `server/src/rooms/*.rs`
- Create: `server/src/nodes/*.rs`
- Create: `server/src/models/*.rs`

- [ ] Define room lifecycle and node heartbeat models.
- [ ] Define config payloads for n2n clients.
- [ ] Keep handlers separate from domain logic.
- [ ] Commit API boundaries.

## Chunk 5: Delivery pipeline

### Task 9: Add GitHub Actions

**Files:**
- Create: `.github/workflows/frontend.yml`
- Create: `.github/workflows/server.yml`
- Create: `.github/workflows/desktop.yml`

- [ ] Add lint/build/test checks for frontend.
- [ ] Add cargo fmt/clippy/test for server and desktop.
- [ ] Keep workflows split by responsibility.
- [ ] Commit CI.

### Task 10: Publish repository metadata

**Files:**
- Create: `.gitignore`
- Create: `LICENSE`
- Create: `.github/ISSUE_TEMPLATE/bug_report.yml`
- Create: `.github/ISSUE_TEMPLATE/feature_request.yml`

- [ ] Prepare public-repo basics.
- [ ] Add contribution-facing metadata.
- [ ] Commit repo metadata.
