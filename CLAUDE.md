# Elevate UI contract

Read [AGENTS.md](AGENTS.md), [Elevate-Autocoach-Design-Library.md](Elevate-Autocoach-Design-Library.md), and [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) before changing the interface. Codex and Claude share these instructions and the same working files.

The September 7, 2026 version 1.1 design library governs colors, typography, component states, native semantics, KPI strips, tables, charts, and accessibility. Product behavior and the uniform 1060px record-drawer width are documented in DESIGN_SYSTEM.md. Earlier blue visual-direction notes and screenshots are historical, not implementation guidance.

Reuse the tokens/components in `dist/design-system.css`, icons/help in `dist/design-system.js`, KPI/status/table/native-control helpers in `dist/components.js`, and chart primitives in `dist/charts.js`. Preserve working business flows and data; coordinate file ownership when another agent is active. Run the documented contract, browser, and design-library acceptance checks before handing off shared UI changes.
