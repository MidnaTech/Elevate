# Pre-migration token inventory

Historical evidence captured immediately before the September 7, 2026 library migration. These declarations are retired and must not be copied into components. The governing values are in [Elevate Autocoach — Design Library](../Elevate-Autocoach-Design-Library.md). Repeated declarations are retained in source order to expose competing definitions.

## dist/styles.css

| Token | Recorded declaration |
| --- | --- |
| `--canvas` | `#f5f7fc` |
| `--surface` | `#ffffff` |
| `--surface-soft` | `#f0f3fa` |
| `--surface-strong` | `#e0e6f2` |
| `--ink` | `#1a2029` |
| `--ink-700` | `#39414c` |
| `--ink-500` | `#5c6672` |
| `--ink-400` | `#5f6c83` |
| `--ink-300` | `#8b94a1` |
| `--border` | `#dfe5f0` |
| `--border-soft` | `#edf0f7` |
| `--border-strong` | `#c4cde0` |
| `--primary` | `#4059d6` |
| `--primary-hover` | `#3046b4` |
| `--primary-soft` | `#edf0ff` |
| `--spotlight` | `#f4f6ff` |
| `--brand-border` | `#c4cef5` |
| `--surface-tint` | `#f8f9ff` |
| `--brand-wash` | `linear-gradient(135deg, var(--primary-soft), var(--surface) 70%)` |
| `--button-ink` | `var(--primary)` |
| `--green` | `var(--primary)` |
| `--green-dark` | `var(--primary-hover)` |
| `--green-soft` | `var(--primary-soft)` |
| `--success` | `#48784a` |
| `--success-soft` | `#e5f2e6` |
| `--success-soft` | `oklch(0.96 0.025 155)` |
| `--rust` | `#b4232a` |
| `--rust-soft` | `#fbe7ea` |
| `--amber` | `#a86216` |
| `--amber-soft` | `#fff0d8` |
| `--violet` | `#7452e8` |
| `--violet-soft` | `#f2eeff` |
| `--red` | `var(--rust)` |
| `--red-soft` | `var(--rust-soft)` |
| `--sidebar-bg` | `#f4f6ff` |
| `--sidebar-hover` | `#e8edff` |
| `--sidebar-active` | `var(--primary-soft)` |
| `--sidebar-text` | `var(--ink-700)` |
| `--sidebar-muted` | `var(--ink-400)` |
| `--sidebar-width` | `224px` |
| `--color-bg-canvas` | `var(--canvas)` |
| `--color-bg-surface` | `var(--surface)` |
| `--color-bg-subtle` | `var(--surface-soft)` |
| `--color-text` | `var(--ink)` |
| `--color-text-muted` | `var(--ink-500)` |
| `--color-action` | `var(--primary)` |
| `--color-action-hover` | `var(--primary-hover)` |
| `--color-success` | `var(--success)` |
| `--color-danger` | `var(--rust)` |
| `--color-warning` | `var(--amber)` |
| `--color-insight` | `var(--violet)` |
| `--color-danger-text` | `#9a1f26` |
| `--color-warning-text` | `#75420a` |
| `--color-insight-text` | `#5530b8` |
| `--color-success-text` | `#3d6a40` |
| `--focus-ring` | `var(--primary)` |
| `--focus-ring-inverse` | `#aebeff` |
| `--shadow-1` | `0 2px 8px rgba(20, 32, 51, .06)` |
| `--shadow-2` | `0 10px 28px rgba(20, 32, 51, .11)` |
| `--shadow-3` | `0 24px 70px rgba(20, 32, 51, .2)` |
| `--elevation-blue` | `#6f8cff` |
| `--elevation-mint` | `#2b8a70` |
| `--control-size` | `44px` |
| `--sidebar-width` | `78px` |
| `--sidebar-width` | `0px` |

## dist/design-system.css

| Token | Recorded declaration |
| --- | --- |
| `--drawer-width` | `1060px` |
| `--drawer-gutter` | `84px` |
| `--space-1` | `4px` |
| `--space-2` | `8px` |
| `--space-3` | `12px` |
| `--space-4` | `16px` |
| `--space-5` | `24px` |
| `--space-6` | `32px` |
| `--radius-control` | `8px` |
| `--radius-card` | `12px` |
| `--font-page-title` | `30px` |
| `--font-section-title` | `15px` |
| `--font-body` | `13px` |
| `--font-meta` | `12px` |
| `--control-height` | `40px` |
| `--table-row-height` | `60px` |
| `--control-height` | `44px` |

The old root also applied the Instrument Sans/Inter font stack. It has been replaced by the library’s literal native system stack. The old shared stylesheet contained gradient fills on navigation, brand mark, overview bands, KPI strips, charts, and drawer headers; the current specification removes them.
