# Elevate design system

This is the shared design contract for Elevate. Apply it to every new screen and every UI edit, including work by Codex and Claude. Change shared patterns here and in their implementation together. Preserve explicit user decisions when they supersede a rule.

The interface should make the next decision easy to see. Show the record, the meaningful result, and its action. Reveal definitions, metadata, and advanced controls when requested.

## Sources of truth

| File | Responsibility |
| --- | --- |
| `DESIGN_SYSTEM.md` | Layout, hierarchy, placement, content, and interaction rules |
| `dist/design-system.css` | Shared tokens, toolbars, view tabs, filters, help, and responsive behavior; loaded last |
| `dist/design-system.js` | Shared `uiIcon()` vocabulary and accessible tooltip behavior |
| `dist/overview.js` | Compact chart helper, Sessions summaries, and Drivers coaching/improvement summaries |
| `dist/session-evidence.js` | Event and clip identity, original incident metadata, and driver/session associations |
| `dist/session-workspace.js` | Session evidence browser, conversation, and per-session reply/private-note drafts |
| `dist/session-workspace.css` | Evidence, map, conversation, and event-browser layout inside shared drawer sizing |
| `dist/styles.css` | Existing brand foundations, shell, and base components |
| `dist/sessions.css` | Session row layouts |
| `dist/analytics-refinement.css` | Analytics-specific charts and tables |
| `dist/drivers-refinement.css` | Driver-specific distribution and rows |
| `dist/supporting-refinement.css` | Groups, Content, and Settings details |
| `tests/browser-smoke.mjs` | Functional and layout contract checks |
| `tests/session-workspace.mjs` | Session evidence sharing, draft preservation, state guards, focus, and responsive checks |

Page-specific styles may define content layout. Common control placement, typography, colors, tab appearance, and disclosure behavior belong in the shared system. Avoid solving a common issue with another page-specific override.

## Workspace navigation

The sidebar contains the brand, a collapse/expand button at the top, global search, and the seven primary destinations. Do not add the removed fleet switcher, account footer, or driver-app preview to this navigation.

On desktop, the sidebar expands to 224px or collapses to a 72px icon rail, returning the space to the workspace. Keep every destination accessible in both states; collapsed icons show their names on hover and keyboard focus. The toggle retains focus and exposes its state through `aria-expanded`. Remember the user's choice locally, with a usable fallback when browser storage is unavailable.

Without a saved choice, medium screens default to the icon rail. At 681–900px, expanding navigation overlays the rail and workspace instead of narrowing the tables. Mobile retains the bottom navigation and More menu. Returning to desktop restores the saved sidebar preference.

## Page anatomy and placement

Use this order in the DOM and on screen:

1. **Page header:** one H1 on the left; page-level actions on the right.
2. **Optional compact overview:** two or three panels of useful context for an operational page, following the overview rules below.
3. **View/data toolbar:** view tabs or quick scopes on the left; search, then Filters, on the right. Reporting screens put their fixed period/scope on the right instead of unsupported search/filter controls.
4. **Applied filters:** one optional line directly below the toolbar. Show chosen values and Clear/Reset only when useful. A closed filter button carries its active count.
5. **Primary content:** table/list for operational pages; KPI summary followed by charts for analytical pages.
6. **Detail or supporting content:** breakdown tables, secondary analysis, and summaries.

Use `.page-heading`, `.heading-actions`, `.data-toolbar`, `.view-tabs`, and `.toolbar-actions`. A dataset toolbar sits directly above the dataset it controls. It may be inside the table card; its control order stays the same.

| Control | Required position and behavior |
| --- | --- |
| Page action | Header right; one emphasized action at most; secondary actions before it |
| Search | Dataset toolbar right, immediately before Filters; visible label for assistive technology; text input remains mounted while results update |
| Filters | Last toolbar control; opens a panel; active count visible when closed |
| Quick view tabs | Toolbar left; one selected view; counts only where they aid selection |
| Fixed report scope | Toolbar right; plain text/calendar context, not a fake dropdown |
| Sort | Inside filter panel unless sorting is the page's principal task |
| Reset | Filter-panel footer left; disabled when nothing can be reset |
| Done / Show results | Filter-panel footer right; closes panel and returns focus |
| Row action | Last column/right edge; descriptive accessible name includes record identity |
| Help | Immediately after the label it explains; no standing paragraph for routine definitions |
| Search results count | One quiet footer or filter-summary location; do not repeat totals in multiple summary strips |

**Allowed exceptions:** manual coaching stays a secondary action because automated coaching is the primary workflow. The Drivers full safety histogram may be collapsed; its compact fleet safety mix remains visible in the overview. Settings puts Save/Discard with the dirty draft, not in the generic data toolbar. Global search stays in workspace navigation. Settings configuration tables (safety event types, coaching rules) carry inline switches, selects, and numeric inputs; every control names its record, and every change enters the same draft → Preview → Save and activate flow.

On narrow screens preserve the same order: header, stacked overview panels when present, full-width view tabs, search and Filters together, applied filters, content. Actions may wrap without reversing order. Never move tabs back into the H1 row to save space.

## Operational overview bands

Sessions, Drivers, and Groups share one compact overview pattern above their dataset. Use two or three panels with short visible labels, a meaningful value, and a compact distribution or trend where the data supports it. Keep the table within easy reach; avoid duplicating all of its status tabs as KPI cards. Put definitions in accessible help, while keeping metric scope, time window, units, and comparison direction visible where needed.

- Fleet summaries remain stable while the table is searched or filtered. A fleet summary shortcut clears conflicting table filters and selects its named scope, so the resulting records match the shortcut. Show the selected state and keep result counts with the dataset.
- Distinguish current workload from weekly performance in each panel. Sessions completion uses the current automated-assignment cohort: the initial fixture has 128 completed of 142 coached for the week of Aug 31. Its current review breakdown comes from the separate 177-record session ledger. Never mix these denominators.
- Drivers use three panels: safety mix, current coaching activity, and a driver improvement. Safety tiers describe the 1,024-driver fixture fleet, while the directory contains 14 representative records. Include Unscored in the fleet distribution; do not derive fleet averages or improving-driver totals from the sample.
- The Drivers coaching panel separates **In progress** from **Completed**. Initially, in-progress work is 5 automated sessions and 2 manager-created sessions labeled One-on-one; derive these from `sessionOriginTotals.automated.system_handling` and `sessionOriginTotals.manual_override.system_handling`. Explain the manual-coaching scope in help. Show the 130 completed sessions separately with **All recorded sessions** as their scope. Never use all-history origin totals as current workload, or imply that these session counts are unique drivers.
- A Drivers improvement highlight must name its sample scope and use the recorded score change. The initial example is Taylor Brooks, **+7 points**, from **71 to 78**, among the 14 directory records. Do not call this driver the fleet leader or imply an unsupported time window.
- Coaching by group belongs on Groups. Its three panels show automated assignments by group for the current weekly cycle, the most improved event-rate trend, and a worsening event-rate trend. Initial workload counts are 48, 37, 31, and 26; Local delivery improves 29% and Long haul · North worsens 8%. Keep the highest safety score in the comparison table rather than repeating it as an overview highlight.
- Group event-rate changes use events per 1,000 trips over the displayed eight-week window. Do not present an attention-count tie as a unique leader or average group rates without trip exposure. Workload counts describe assignments, not unique drivers.
- Compact charts use shared tokens, stable semantic colors, accessible summaries, and honest scales. Interactive segments retain short visible labels and work with keyboard and touch. The full driver histogram is an optional disclosure inside the safety panel.
- Stack panels on narrow screens without changing their order or introducing page-level horizontal scrolling. Reuse shared overview styles and `overviewSparkline()` rather than introducing a separate chart style per page.

## Tables and statuses

- Put identity first, one value per comparison column, and actions last. Prefer semantic `<table>` markup for numerical analysis.
- Use sentence-case headers, quiet separators, and tabular numerals. Right-align numerical comparison columns and their headers. Keep names and descriptive fields left-aligned.
- Default to a single line per desktop row. Keep secondary metadata in help or record detail; do not repeat owner, reporting cycle, units, and lifecycle explanations under every value.
- Display one meaningful operational status. Do not stack a lifecycle badge and a reason badge in the same cell.
- One coaching vocabulary everywhere. Lifecycle: **Automated** (in progress under automation, bolt icon), **One-on-one** (manager-led coaching, user icon), **Needs review**, **Completed**, **Archived**; drivers only: **On track**. "In progress" is used solely as the umbrella for Automated + One-on-one (tabs, overview headings). Review reasons: **Replied** (message), **Overdue** (clock), **Repeated** (repeat), **Blocked** (alert). Never use System handling, Escalated, Attention, Manual, Coached, or Monitoring as status words. Session lists and records show **Coach**: "Automated" for automated sessions, otherwise the name of the manager who ran the one-on-one. A review that has no session yet (repeat offender, critical event) is still **Needs review**; its row action reads **Start session**, and a record that already has one reads **View session**.
- Programs, Groups, and Drivers share the column set **Automated · One-on-one · Needs review · Completed** (plus the entity’s own metrics), and every count is read from the session ledger so tables and the Automation Centre stat band add up.
- Status meaning must survive loss of color. Visible words and distinct icon shapes carry it. Reserve stronger color for attention states.
- Compact analytical result icons may stand alone if they have accessible names and focus/tap explanations. Operational statuses retain visible text.
- On mobile, operational records become compact cards that retain identity, core status, and next action. Numerical analytics tables may scroll inside their own named, keyboard-focusable region, retaining all columns. The page itself must not scroll horizontally.

## Charts and analytics order

The reporting page order is **scope/view → KPIs → main chart → detail table**. Do not scatter competing KPI strips below unrelated tables.

Every chart uses this anatomy:

1. Title: the question or metric being shown.
2. Context: visible unit, comparison direction when relevant, and time window. Examples: “Assignments per week · last 8 weeks” and “Events per 1,000 trips · lower is safer.”
3. Legend: stable series order and colors, placed before the plot.
4. Plot: readable labels, subtle gridlines, honest scales, and no decorative borders on bars.
5. Optional disclosure: collapsed text summary, methodology, or data details.

Before/after comparisons use one paired-dot row per program, group, or driver (hollow dot before, solid dot after, change at the row end) with a Before/After legend; do not stack parallel trend lines for that question.

Keep definitions in help, but keep units, reporting windows, and direction visible. Use the same series colors and legend order wherever a metric recurs. Reduce mobile date-label density before shrinking text; retain all underlying observations. A compact score distribution may omit a separate legend if its labeled interactive tiers already identify every category.

## Visual tokens

Use the existing Instrument Sans/system font stack. Use semantic colors from `dist/styles.css`; do not choose page-specific hex colors for established roles.

| Role | Token / default |
| --- | --- |
| Main text / supporting text | `--ink` / `--ink-500` |
| Actions / selected view | `--primary` / `--primary-soft` |
| Success / warning / danger | `--color-success-text` / `--color-warning-text` / `--color-danger-text` |
| Surfaces / separators | `--surface`, `--surface-soft`, `--border`, `--border-soft` |
| Page title / section title | `--font-page-title: 30px` / `--font-section-title: 15px` |
| Body / metadata | `--font-body: 13px` / `--font-meta: 12px` |
| Spacing | `--space-1` through `--space-6`: 4, 8, 12, 16, 24, 32px |
| Control / card radius | `--radius-control: 8px` / `--radius-card: 10px` |
| Control height | `--control-height: 40px`; 44px on narrow screens; keep touch targets at least 44px for primary controls |
| Row height | `--table-row-height: 60px` reference; adjust for content, not ornamental whitespace |

Use surface borders for grouping; reserve pronounced shadows for open floating panels and dialogs. Closed drawers must cast no visible shadow. Avoid uppercase labels, redundant pills, and high-contrast outlines around routine values.

## Help and disclosure behavior

Use `uiIcon(name)` for generated UI. Static SVGs must use the same 24×24 coordinate space, currentColor, rounded strokes, and matching geometry.

Help example:

```html
<button type="button" class="info-hint"
        aria-label="How completion is calculated"
        data-tooltip="Completed assignments divided by automatically coached assignments.">
  <!-- Shared info SVG -->
</button>
```

Tooltip text must work on hover, keyboard focus, and tap. Escape dismisses the tooltip without clearing a search field or triggering an unrelated action. Passive focusable icons need an accessible name. Never nest an interactive button inside a clickable table-row button; the row's accessible description and detail view must expose its metadata.

Reuse `.filter-sheet` and its existing open/close helpers. The panel must contain focus, make background content inert, close with Escape/backdrop/Done, and restore focus. Navigation must release modal state. Filters apply to the visible data, preserve URL state where supported, and reset predictably.

## Record drawers

All record drawers share one width: `--drawer-width: 1060px`, capped at `calc(100vw - var(--drawer-gutter))` with `--drawer-gutter: 84px`. At 680px and below, every drawer is full viewport width. Programs, Groups, driver portfolios, sessions, and session composers use this same contract. Nested views change their content without changing the drawer's width. Do not introduce page-specific width overrides; shared sizing belongs in `dist/design-system.css`, loaded last.

Keep a compact header, one clear close action, and a scrolling content body. Arrange content to use the shared width; on narrower screens stack content without horizontal page overflow. Drawers contain focus, make background content inert, support Escape and backdrop dismissal, and restore the originating control when closed.

### Driver portfolios

The Drivers directory opens a driver portfolio, with identity and group once in the header. The content order is **This week → Rule breakdown → Recent exceptions → Coaching**. Retain the shared record drawer width and one scrolling body. A driver row must not open a session directly.

- The directory columns are **Driver · Safety score · Top event · Last coached · Status · View**. The whole row opens the portfolio; the driver name and **View** remain its keyboard openers.
- **This week** is one bordered four-cell strip: the latest safety score with its change and previous score inline (58 ↓9 prev 67) above a compact 0–100 scale, then Miles, Trips, and Days driven. Daily-mile bars follow. Display the observed period and data scope. The fixture uses illustrative driving observations for Aug 24–30; the score comparison dates are unknown, so do not describe its point change as a weekly change. Missing driving observations remain unavailable, not zero.
- **Rule breakdown** is always visible: a heading, the scope line **Recorded evidence · current sessions**, the record count, and one row per rule with its count. Group unique source safety-evidence records from the driver's non-archived sessions by their recorded category or trigger, using stable event IDs. One multi-trip pattern is one record. Exclude explicitly dismissed evidence and coaching workflow failures.
- **Recent exceptions** has exactly the **Exceptions** and **Video** segments and a scope line naming the sources (Rule exceptions · from Geotab). Rows show the event title and time on one line; expanding a row opens its video/data and map with an explicit linked-session action. Video contains only events with clips. Deduplicate shared events by stable ID. Dismissed history stays labeled; workflow delivery failures are not driving exceptions.
- **Coaching** has exactly the **Current sessions** and **Past sessions** segments. Current contains automated, one-on-one, and needs-review sessions plus pending reviews with **Start session**; Past contains completed and archived sessions. Each row shows the program and its due or recorded time on one line, one status, and a visible **Open session** action. There are no expandable row details, dropdown filters, repeated summaries, or permanent metadata rails.

## Footage in coaching records

The session is an evidence review and conversation workspace. Keep the shared record drawer width unchanged: compact header, evidence on the left, and conversation with a compact composer on the right. Stack the working areas on narrower screens. The evidence pane reads top to bottom: the **Why this session was created** line, a program card with its collapsible event-type breakdown, then a **Videos** list of compact rows (duration chip, timestamp, event type, source). Choosing a row opens an inline viewer with the incident map on the left and the footage on the right; choosing it again closes the viewer. Camera controls appear only when an event has multiple clips.

- The header names the program, with one context line (Coaching session · driver · opened by coach, date), one operational state with its due time, the lifecycle action, and Close. There is no Details dialog; the breakdown card and row facts carry what a coach needs. Keep one collapsed **Earlier activity** log beside the Conversation heading, and summarise shared evidence under each message as a collapsed **n videos attached** disclosure. Do not restore the large repeated summary, permanent metadata rail, duplicate history, or separate attachment chips.
- Incident maps use Leaflet with OpenStreetMap tiles when an event has recorded coordinates, with the coordinates and an **Open in Google Maps** link beneath. Leaflet loads on demand from cdnjs; if it is unavailable the same position falls back to an OpenStreetMap embed. Without coordinates the map stays an explicitly labelled illustration.
- Clips belong to stable event IDs. Selecting an event or camera previews evidence without changing selection or assignment. Selecting an event for a reply selects all its clips together; telematics patterns remain shareable event data with zero video clips.
- **Add events** opens one browser with **This driver** and **Unassigned** scopes, search, event-level checkboxes, and a preview. **Use selection** stages the draft's choices. **Cancel**, Escape, backdrop dismissal, and Close discard changes made inside the browser. The composer's compact selection count opens this same browser.
- Only **Send** shares evidence and assigns selected unassigned events to the driver/session. Preserve each event's original category, source, type, timestamp, vehicle, and location; a coaching session link never rewrites incident facts. Show shared events with the message so they reopen in the same viewer.
- The first draft selects linked evidence not already recorded as shared. Clear that draft's selection after Send and retain the cleared state when the drawer reopens. Keep per-session reply text, private-note text, cursor positions, active event/camera, and unsent selection in memory. Updating evidence must preserve the composer and its draft.
- Private notes are explicitly team-visible. Hide sharing controls in note mode, preserve the separate reply selection, and never share or assign that selection when saving a note.
- Completed and archived records retain evidence and conversation but have no composer or Add events action. Preserve Archive/Restore semantics. Delivery-blocked and retry-queued records retain their account-link/retry flow and reject replies or evidence assignment while unresolved.
- Count only actual video evidence in session row and Automation Centre clip counts. Durations expressed as days, trips, or event totals are patterns, not footage. Never generate extra media, locations, vehicles, or severity from a session hash or workflow status.
- Use supplied media URLs and valid recorded coordinates when available. Otherwise label footage and map illustrations explicitly, state the missing location/coordinates, and omit the incident pin. Retain source location text where recorded; never infer a route without route data.

See [session workspace](docs/session-redesign.md) for the installed interaction and data contract. Run `npm run test:sessions` when changing this workflow.

## Content and implementation rules

Use concrete labels: “Filters,” “Review,” “Completed.” Avoid instructional subtext when the control already explains itself. Preserve explanations that affect a decision, such as automation modes, metric scope, and destructive consequences.

Every new affordance must perform its named operation. Do not introduce toast-only filters, exports, or creation controls. Existing prototype limitations are recorded in `docs/ui-review.md`; do not imply they have become functional through styling changes.

For a new page, reuse the patterns above before adding a variant. If a workflow truly requires a different placement, document the exception here and implement it intentionally. A permanent change to common behavior requires updating the shared classes and the relevant browser checks.

Before handing off UI changes, verify the affected interaction and its narrow-screen layout. For shared changes, run `npm run check`, `npm test`, and `npm run test:browser` with the local app served and Playwright available. The browser suite checks actual asset loading, placement, navigation, filtering, tooltips, and overflow at 1440, 1024, 768, and 390px.
