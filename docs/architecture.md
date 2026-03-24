# VNetPlay Architecture

## Product direction
- High-efficiency desktop-first LAN gaming tool.
- Vercel-inspired minimal UI with strong information hierarchy.
- Modular code boundaries to prevent giant files.

## Core structure
- `app/`: React + TypeScript UI layer.
- `desktop/`: Tauri wrapper and Rust desktop core.
- `server/`: Rust control plane.
- `docs/`: architecture, plans, and UI rules.

## Rules
- Split by responsibility, not by technical vanity.
- Prefer many small files over one oversized orchestrator file.
- UI pages compose feature modules; they do not own business logic.
- Rust command handlers remain thin and delegate to services.
