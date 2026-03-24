# Module Boundaries

## File size discipline
- Prefer keeping files below roughly 250-300 lines when practical.
- Split immediately when a file starts mixing view logic, state, network calls, and formatting.

## Frontend boundaries
- `pages/` assemble screens.
- `features/` own domain logic.
- `components/` provide reusable UI primitives.
- `lib/` holds shared infrastructure.

## Rust boundaries
- `commands/` for Tauri or API entrypoints.
- `services/` for domain workflows.
- `state/` for app state.
- `network/` for process and route handling.
