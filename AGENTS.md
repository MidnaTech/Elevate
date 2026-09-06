# Repository instructions

For any frontend or UI/UX work, read [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) first. It is the shared design contract for control placement, page hierarchy, tables, charts, status language, and accessibility.

Reuse the shared classes and tokens in `dist/design-system.css` and the icon/help behavior in `dist/design-system.js`. Keep search, tabs, filters, and actions in their specified slots. Update the design contract when intentionally changing a shared rule; avoid isolated page overrides for common patterns.

This is a static prototype served from `dist/`. Preserve existing user changes. Validation commands and browser setup are documented in [README.md](README.md).
