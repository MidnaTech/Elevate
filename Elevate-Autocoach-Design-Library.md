# Elevate Autocoach — Design Library

**Version 1.1 · 7 September 2026 · Implementation specification**  
**Theme: neutral light workspace with Ember orange.**  
**Brand accent: `#B84A00`. Primary data series: `#236C72`.**

This document defines one shared system for Automation Centre, Sessions, Session workspace, Analytics, Content library and Settings. It incorporates the requested move away from blue to an orange direction inspired by Cloudflare. Elevate values reflect the supplied baseline and the explicit user amendment below; they are not sampled competitor tokens. The deliverable is a single Markdown document; reference screenshots are embedded from their public source URLs and require network access to display.

## User amendment — version 1.1, 7 September 2026

This repository specification incorporates the user's follow-up direction: brighten neutral surfaces, reduce all text and line-height tokens by 15%, use one petrol colour for attention-category dots and bars, move KPI explanations into accessible info hints, put long chart source details inside **Summary and data**, and consolidate Activity into a full-width weekly chart followed by one program table. These decisions supersede the corresponding version 1.0 values and presentation rules throughout this document. The original supplied file in Downloads is historical and remains unchanged.

The HTML root stays 16px: icon targets, spacing, chart geometry, table dimensions and shared drawer widths do not shrink with typography. The six text steps now range from 10.2px to 27.2px; body/control text is 11.9px and shared section/drawer headings are 13.6px. Keep zoom, reflow, contrast, focus, touch targets and semantic controls intact. No other status, action or chart-series meanings change.

## 0. Research and evidence

### Method and limits

Reviewed official product documentation, design-system guidance and vendor-published screenshots for all eleven requested products, plus Cloudflare. The screenshots were visually inspected. These are public examples, not an authenticated audit of every current product screen. Historical captures are identified. Exact vendor CSS values, font sizes and row heights were not inferred from scaled images. A still image establishes its visible selection treatment, not unseen hover, focus or disabled behaviour. Those Elevate states are specified independently in section 5.

The repeatable finding is **neutral structural hierarchy with concentrated colour**. The references do not unanimously prohibit brand-coloured charts, coloured KPI values or tinted groups. Elevate deliberately adopts stricter boundaries because its daily task is exception handling. “Avoid” below means a visible absence in the inspected example or a recommendation for Elevate, not an undocumented vendor-wide prohibition.

### Samsara — actionable safety hierarchy

![Samsara historical safety dashboard with an action strip, neutral panels and analytical charts](https://images.ctfassets.net/bx9krvy0u3sx/3x3CgFdyxqD7tHpY8FDTFS/ddd3094e19a748d0baddc2cc7498a3b3/unnamed__8_.png?fm=webp&h=900&q=80&w=1600)

The pictured dashboard places a narrow navy navigation rail beside a pale canvas and white panels. Its action strip precedes score and risk analysis. Compact risk rows combine labels, figures and sparklines. Blue appears in active navigation, links and chart data; green marks favourable movement. Selection uses a filled navigation item and a tab underline. No decorative gradient card wash is visible. Borrow the action-first hierarchy and neutral panels; separate chart colour from action colour in Elevate. Full status sets and hover/focus are unverified. **Scope:** historical screenshot from June 2021. [Official source: Samsara safety reporting and coaching](https://www.samsara.com/blog/advance-safety-journey-reporting-coaching-tools).

### Motive — severity and workflow are separate

![Motive Safety Events table with severity tags and coaching status in separate columns](https://helpcenter.gomotive.com/hc/article_attachments/26710167890333)

A navy navigation area frames a white, compact event table. Thin row rules, thumbnail evidence, small labels and neutral filters carry the density. Red and yellow severity labels are distinct from the coaching-state column. The Events tab uses a short blue indicator. Colour stays local to labels rather than washing entire rows. Borrow separate severity, workflow and method fields; avoid forcing them into one rainbow status column. This screenshot does not establish a chart palette or keyboard-focus treatment. **Scope:** help article updated April 2026. [Official source: Safety Events Media](https://helpcenter.gomotive.com/hc/en-us/articles/20541752271517-View-Safety-Events-Media-on-Motive-Fleet-Dashboard).

### Geotab — neutral cards and floating chart controls

![Geotab upgraded dashboard showing white chart cards and an open chart action menu](https://www.geotab.com/CMS-Media-production/Blog/NA/2025/August/whats-new/image5.png)

White cards sit on a pale canvas with fine boundaries, compact context labels and dark values. Navigation and headings use darker blue tones; plotted colours and small performance indicators carry data meaning. An open white menu is elevated above the ordinary chart card. Borrow that separation: borders organize permanent content, shadows identify floating content. No gradient card washes are visible. The crop cannot establish a complete status vocabulary, table density or hover/focus rules. **Scope:** upgraded-dashboard documentation published August 2025 and updated November 2025. [Official source: MyGeotab dashboard update](https://support.geotab.com/product-updates/new-user-onboarding-mygeotab).

### Lytx — restrained metric hierarchy inside a dense shell

![Lytx dashboard overview with a dark navigation shell and light analytical modules](https://www.lytx.com/getContentAsset/cd8fcbb8-0949-4a41-9e34-bee3e5c7394a/dfc3d011-8f63-43f6-9ed8-4b444333a1d0/fleetmanagementdashboardcover.png?language=en-US)

A navy shell surrounds light grey workspace and white analytical modules. Small titles, compact tabular information and darker figures organize a high volume of information. Related fleet-metric examples use green/red selectively. Charts have local colour keys; the overview does not prove a single categorical-palette rule. Selected navigation is differentiated, but its interaction states are unverified. Borrow the neutral metric hierarchy and bounded modules; avoid copying the number of simultaneous widgets into Elevate’s exception-first view. No decorative panel gradient is visible. **Scope:** official dashboard guide; individual capture version unspecified. [Official source: Fleet management dashboard guide](https://www.lytx.com/guide/fleet-management-dashboard-guide).

### Linear — status shape, compact tables and quiet selection

![Linear Insights with status icons, stacked bars and a compact pivot table](https://webassets.linear.app/images/ornj730p/production/c845c78338ca581e6794e8aa2731d02bdd5b058f-2160x1327.png)

Near-black surfaces and fine charcoal rules support compact, neutral totals. Status headers combine words with different icon shapes; chart colours correspond to the table headers. The documentation connects chart hover and selection to underlying table data, without establishing an exact hover colour. Borrow the redundant status encoding and chart-to-table drilldown. [Official source: Linear Insights](https://linear.app/docs/insights).

In the [dashboard examples](https://linear.app/docs/dashboards), selected navigation and tabs use lighter neutral fills while large figures stay neutral. Status and priority marks carry colour. Promotional gradients surround some screenshots **outside** the application frame; they are not application panel backgrounds. Do not copy that framing into Elevate. Exact typography and keyboard-focus appearance remain unverified.

### Stripe Dashboard — neutral values and explicit comparison

![Stripe Payments analytics with neutral KPI values, signed changes and a dashed comparison line](https://b.stripecdn.com/docs-statics-srv/assets/overview.61ec7a7cfe8a8bc7a503c00c82d59509.png)

White surfaces, cool grey borders and muted labels establish the hierarchy. Headline figures stay dark; green/crimson deltas carry direction. Purple marks the selected tab, selected metric border and current-period chart line; the comparison line is grey and dashed. The export control is neutral. Borrow ink values and the redundant comparison encoding, while deliberately separating action and series hues. Flat panels avoid decorative gradients. This crop does not establish global canvas separation, table density, workflow status sets or hover/focus. [Official source: Payments analytics](https://docs.stripe.com/payments/analytics).

### Vercel — explicit state roles and neutral quantities

![Vercel Observability with response-series colours, neutral headline values and route tables](https://7nyt0uhk7sse4zvn.public.blob.vercel-storage.com/docs-assets/static/docs/concepts/observability/O11y-Tab-Light.png)

Near-white canvas, white plots and fine boundaries support dark quantitative headlines. Response families have labelled blue/amber/red series. Flat chart-area tint encodes data; it is not a panel gradient. Compact route tables use horizontal rules, right-aligned durations and neutral quantity bars. Borrow neutral quantities and local semantic colour. [Official source: Observability](https://vercel.com/docs/observability).

[Geist colours](https://vercel.com/geist/colors) explicitly distinguish background, component default/hover/active, border and text roles. [Geist tabs](https://vercel.com/geist/tabs) document visible focus, keyboard movement and URL state. [Geist tables](https://vercel.com/geist/table) recommend tabular numerals and button-based sorting. These are documented principles; they do not establish Elevate’s exact values.

### Mixpanel — independent chart themes, with useful counterexamples

![Mixpanel chart customization showing a categorical palette, compact table and query controls](https://raw.githubusercontent.com/mixpanel/docs/main/images/theme-select-1-updated.png)

White report surfaces, compact aligned tables and subordinate plot labels keep the analysis readable. Purple actions and a pale selected Chart tab concentrate interaction emphasis. Query blocks use flat tint; categorical series have distinct assignments. Chart themes and per-series colours are independently configurable. Borrow reusable data palettes; avoid bringing multiple tinted query blocks into ordinary coaching views. Hover/focus and operational statuses remain unverified. [Official source: Chart customization](https://docs.mixpanel.com/docs/features/chart-customization).

The historical [Board example](https://docs.mixpanel.com/docs/boards), whose screenshot filename dates to January 2022, also colours KPI figures purple. Elevate explicitly rejects that treatment. This is a counterexample, not evidence that every reference follows Elevate’s ink-only KPI rule.

### Amplitude — ink totals, directional change and readable anatomy

![Amplitude chart card with neutral totals, signed changes and a labelled time series](https://www.amplitude.com/docs/images/analytics/dashboards-summary-metrics-png.png)

A white, thin-bordered card places dark takeaway metrics above smaller labels and a blue series. Green signed changes carry comparison meaning. The light blue area is a flat data fill. Borrow the title–metric–context hierarchy and separate delta treatment. The crop does not establish canvas separation, table density, tabs or interaction states. Green growth in this example is not a rule that every increase is good: increasing risk events must be adverse in Elevate. [Official source: Dashboard display preferences](https://www.amplitude.com/docs/analytics/dashboard-preferences). [Chart-colour documentation](https://amplitude.com/docs/analytics/charts/customize-your-charts-colors) provides separate chart themes.

### Datadog — distinguish palette purpose and contain tint

![Datadog compact table with conditional colour contained inside cells](https://docs.dd-static.net/images/dashboards/widgets/table/table_conditional_formatting.37efc410d6bc13615a935be6c834f626.png)

White rows, fine horizontal dividers, dark values and right-aligned numbers support density. Conditional green/amber tint stays inside relevant cells. The associated format editor demonstrates a blue tab underline, filled selected segment and pale selected card with checkmark: different component roles can legitimately use different selection treatments. Hover/focus are unverified. Borrow contained tint and explicit selection cues; retain one rule per component. [Official source: Table widget](https://docs.datadoghq.com/dashboards/widgets/table/).

![Datadog semantic palette example with named log-state series](https://docs.dd-static.net/images/dashboards/guide/colors/6_semantic_interface.fac6dfe1cbc3394486680a66bd5db5a1.png)

The guide distinguishes categorical/consistent identity palettes from semantic, sequential and diverging palettes. The visible semantic legend includes red-family severe states, blue info, grey notice, green OK and orange warning. Several severe states have close reds; Elevate should use fewer semantic families plus icons and words. Do not mistake sequential data scales for permission to apply decorative UI gradients. [Official source: Widget colours](https://docs.datadoghq.com/dashboards/guide/widget_colors/).

### Retool — separate action, neutral and chart settings

![Retool table example with neutral rows and small categorical tags](https://docs.retool.com/assets/images/design_image9-f5c89f2d8ca22f22b88a079b8d55fb0c.png)

Compact white rows, subdued headers, light dividers and small pastel tags contain visual complexity. These tags encode categories, not a universal workflow status palette. The guide recommends limiting prominent solid actions and reducing unnecessary borders and shadows. Borrow restrained density; avoid arbitrary tag colours for process states. The screenshot does not establish selected tabs or focus. [Official source: Retool design guidance](https://docs.retool.com/education/coe/well-architected/design).

[Retool theme documentation](https://docs.retool.com/build/apps/guides/create/themes) separately exposes Accent, Gray scale, Chart colors, Density and Typography. That role separation directly supports Elevate’s implementation. Elevate additionally prohibits component-specific colour overrides and trend-to-brand aliases.

### Cloudflare — orange inspiration with contrast discipline

![Cloudflare historical dashboard comparison showing an orange brand mark within neutral operational surfaces](https://blog.cloudflare.com/_image?f=webp&fit=cover&h=464&href=https%3A%2F%2Fblog.cloudflare.com%2F_emdash%2Fapi%2Fmedia%2Ffile%2F01KW477Y9S8PJ7EPA1RY3B9G0A.png&position=center&w=715)

Cloudflare’s historical dashboard combines an orange brand mark with neutral surfaces and **blue** actions. It is brand inspiration, not evidence for orange primary buttons. [Official source: Dashboard dark mode, 2021](https://blog.cloudflare.com/dark-mode/).

Its [colour-system article, 2019](https://blog.cloudflare.com/thinking-about-color/) describes moving beyond a palette generated from a single hue and testing contrast and real charts. The labelled historical logo oranges are `#F38020` and `#FAAE40`. Our calculations give white-text contrasts of 2.65:1 and 1.88:1, respectively. Elevate instead uses its own deeper `#B84A00`, giving 5.23:1. This retains a warm orange identity while supporting compact, readable actions.

## 1. Principles and brand

### Six principles

1. Elevate’s identity comes from a consistent orange signature, clear typography and orderly space.
2. Neutral surfaces carry daily work; colour is reserved for interaction, explicit status and data meaning.
3. Automation is the ordinary state, while the small number of human decisions receive structural priority.
4. Headlines and KPI numbers remain ink-coloured, with direction expressed separately through a labelled change.
5. Each component has one state model across every screen, and keyboard focus remains distinct from selection.
6. Every status and chart comparison remains understandable through words, symbols and values when colour is unavailable.

### Brand signature

| Decision | Required treatment |
| --- | --- |
| Product name | **Elevate Autocoach**; “Elevate” is the primary wordmark and “Autocoach” the descriptor. |
| Theme | One light theme: cool neutral structure, Ember orange actions, petrol data. |
| Wordmark | System sans, 17px/23.8px, weight 600, `--ink`; descriptor 10.2px/13.6px, weight 400, `--ink-500`. |
| Mark | A simple 24×24 rising-path symbol: two parallel stepped strokes, 2px stroke, `--primary`, rounded ends; no enclosing orange tile. Keep 8px clear space. This is a brand symbol, never a chart or status icon. |
| Placement | One mark/wordmark in the sidebar header; no repeated logo watermark, orange header band or tinted page frame. |
| Voice | Plain operational verbs: “Review reply”, “Open session”, “Save rules”. Name the completed action and the next step. Use “Needs you this week” and “Automation this week”. |
| Icons | Consistent 16×16 SVG viewBox, 1.75px stroke, rounded joins. Use explicit icon shapes; do not use emoji for status. |
| Ownership | One shared stylesheet and one status dictionary. Any token change requires checking every shared component, rather than repainting an individual page. |

## 2. Colour system

### 2.1 Neutrals

All colour tokens resolve to literal six-digit sRGB hex values. “Soft” and “strong” describe neutral surface contrast, not coloured thematic washes.

| Token | Hex | Role |
| --- | --- | --- |
| `--canvas` | `#FAFBFD` | Page canvas outside content surfaces. |
| `--surface` | `#FFFFFF` | Cards, tables, KPI strip, drawer and dialog interiors, chart plots. |
| `--surface-soft` | `#FCFDFE` | Table headers and subtle neutral grouping. |
| `--surface-strong` | `#F3F5F7` | Hover fill and disabled control fill; segmented-control containers remain white. |
| `--border-soft` | `#EEF1F5` | Decorative row separators and chart gridlines. |
| `--border` | `#DEE4EB` | Card boundaries and structural dividers. |
| `--border-strong` | `#7F8B9A` | Required control boundaries and essential chart axes. |
| `--ink` | `#18212F` | Headings, headline values, selected labels. |
| `--ink-700` | `#364152` | Table body and normal body text. |
| `--ink-500` | `#4F5D70` | Field labels, context, axis labels. |
| `--ink-400` | `#59697C` | Secondary metadata and captions. |
| `--ink-300` | `#606E80` | Placeholder and disabled-control text; the lightest approved text. |

Text contrast ratios, calculated from the exact values above, are shown below. **Every listed ink passes normal-text WCAG AA on every neutral surface.** Ratio rounding is for display only; pass/fail uses unrounded values. [WCAG text contrast](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html); [relative-luminance definition](https://www.w3.org/TR/WCAG22/relative-luminance.html).

| Text token | Surface `#FFFFFF` | Soft `#FCFDFE` | Canvas `#FAFBFD` | Strong `#F3F5F7` |
| --- | ---: | ---: | ---: | ---: |
| `--ink` | 16.19:1 | 15.89:1 | 15.63:1 | 14.81:1 |
| `--ink-700` | 10.32:1 | 10.13:1 | 9.97:1 | 9.44:1 |
| `--ink-500` | 6.70:1 | 6.58:1 | 6.48:1 | 6.13:1 |
| `--ink-400` | 5.62:1 | 5.52:1 | 5.43:1 | 5.14:1 |
| `--ink-300` | 5.20:1 | 5.10:1 | 5.02:1 | 4.76:1 |

Decorative borders do not have to carry an interaction boundary. Inputs and checkboxes use `--border-strong`, which exceeds 3:1 on all four neutrals. Do not substitute `--border-soft` for an input outline. [WCAG non-text contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html).

### 2.2 One action accent: Ember orange

| Token | Hex | Exact use |
| --- | --- | --- |
| `--primary` | `#B84A00` | Primary-button fill, underlined links, selected markers and brand symbol. |
| `--primary-hover` | `#963C00` | Primary-button hover/pressed fill; link hover/pressed text. |
| `--primary-soft` | `#FFF2E8` | Small selected controls, selected table rows and active filter chips. |
| `--spotlight` | `#FFE2CC` | Pressed selection fill only; never an insight card or page background. |
| `--button-ink` | `#FFFFFF` | Text and icons on primary buttons. |
| `--focus-ring` | `#713000` | Keyboard outline, separated from the control by a 2px neutral gap. |

Allow one visually dominant primary action per work region. Ordinary row actions use links or neutral buttons. Selected regions keep `--ink` text; the orange marker and state semantics identify selection. Orange is prohibited in charts, KPI figures, KPI meter fills, chart legends, status badges, canvas, cards, table headers, conversation bubbles and decorative backgrounds. The narrowly scoped control and selected-row fills above are the only interface background exceptions.

`--primary` on `--primary-soft` is 4.76:1, but on `--spotlight` is only 4.23:1. Therefore **all selected/pressed-control labels use `--ink`, not orange**. Do not place ordinary orange links on `--spotlight`.

### 2.3 Semantics

| Family | Solid / soft | Status meaning | Required icon shape |
| --- | --- | --- | --- |
| Success | `--success #216E47` / `--success-soft #EAF5EE` | Completed; explicitly favourable change | Circle with check |
| Warning | `--amber #7A5900` / `--amber-soft #FFF4D6` | Needs review; attention without missed deadline | Triangle with exclamation |
| Danger | `--rust #B02A46` / `--rust-soft #FCECF0` | Overdue; explicitly adverse change | Octagon with exclamation; overdue also names the missed due date |
| Info / reply | `--violet #7047A3` / `--violet-soft #F2EDF9` | Replied; new human information | Speech bubble |
| Neutral / automated | `--automated #596675` / `--automated-soft #EDF0F4` | Automated; assigned; awaiting driver; one-on-one method | Gear, clock or two-person outline according to the word |

The legacy name `--rust` now denotes the specified crimson/rose danger colour; it must not resolve to orange or brown. `--violet` is the reply/info role, not a second brand accent.

Keep dimensions independent:

| Displayed word | Dimension | Tokens and icon |
| --- | --- | --- |
| Completed | Session state | Success + circle-check |
| Replied | Session state | Violet + speech bubble |
| Assigned / Awaiting driver | Session state | Automated + clock |
| Needs review | Attention | Amber + warning triangle |
| Overdue | Attention | Rust + exclamation octagon |
| Repeated | Recurrence / attention | Amber + repeat arrows, always the word “Repeated”; not a new orange severity |
| Automated | Method | Automated + gear |
| One-on-one | Method | Automated + two-person outline |

Use separate State, Attention and Method columns when those dimensions are needed. A completed session clears its obsolete overdue flag. “Automated” must not mean “successful”, and “One-on-one” must not imply danger. Repeated and Needs review intentionally share an attention family; their word and shape distinguish them. The set has five governed semantic families, not seven unrelated status hues.

**Separation evidence:** computed CIELAB ΔE76 from sRGB using a D65 reference white. The semantic-family minimum is **40.7**; the smallest semantic-to-brand distance is **36.8** (warning versus orange). These quantify separation for normal colour vision, not universal perceptual thresholds or proof of colour-vision-deficiency accessibility. Soft fills are supporting decoration; the solid icon plus word carries meaning. [W3C discussion of colour-difference metrics](https://www.w3.org/TR/css-color-4/#color-difference); [WCAG use of colour](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html).

| ΔE76 | Success | Warning | Danger | Reply | Automated | Brand |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Success | — | 51.5 | 87.9 | 91.4 | 40.7 | 85.6 |
| Warning | 51.5 | — | 57.4 | 96.4 | 58.6 | 36.8 |
| Danger | 87.9 | 57.4 | — | 63.0 | 62.2 | 41.6 |
| Reply | 91.4 | 96.4 | 63.0 | — | 50.9 | 99.9 |
| Automated | 40.7 | 58.6 | 62.2 | 50.9 | — | 79.0 |
| Brand | 85.6 | 36.8 | 41.6 | 99.9 | 79.0 | — |

### 2.4 Data palette

| Token | Hex | Meaning |
| --- | --- | --- |
| `--chart-primary` | `#236C72` | Petrol: current-period magnitude, automated session count and neutral KPI meter. |
| `--chart-secondary` | `#8A5A44` | Umber: second categorical series, e.g. one-on-one count. |
| `--chart-tertiary` | `#8B4F7D` | Plum: third category when required. |
| `--chart-quaternary` | `#64743A` | Olive: fourth category when required. |
| `--chart-baseline` | `#7D8795` | Before/comparison series on a white plot; dashed when a line. |
| `--chart-track` | `#E1E6ED` | Decorative meter track; never text or the sole indication of an amount. |
| `--chart-score` | `#364152` | Safety-score line with white casing and circular markers. |
| `--chart-reduction` | `#216E47` | Reduction in undesirable events; favourable outcome delta. |
| `--chart-increase` | `#B02A46` | Increase in undesirable events; adverse outcome delta. |
| `--chart-unchanged` | `#596675` | No change, with an equals sign and words. |

Within the Automation/Attention Centre, category dots and magnitude bars all use `--chart-primary` petrol; the adjacent labels identify their categories. Do not assign a different colour to each attention category. Elsewhere, categorical colours identify series; they never imply performance. Keep a category’s assignment stable across tabs and filters. Limit one plot to four visible categories; additional categories use filtering or a detail table. Use semantic colours only for measures with a declared desirable direction. For safety score and completion rate, an increase is favourable; for unsafe-event rate, an increase is adverse. Volume alone has no good/bad colour.

Do not use petrol and green as adjacent opposing categories: their luminance is similar. Before/after magnitude is grey versus petrol; its signed change is separately green/crimson. Preserve explicit series labels, marker/line differences and values for colour-independent reading.

### 2.5 No-alias rule

Every root token contains a literal value. No root declaration may contain `var(--other-token)`, and semantic or data meaning must never depend on the brand token. Shared classes consume tokens normally with `var()`.

`--green` resolves directly to **`#216E47`**, as a deprecated compatibility spelling for success; new code uses `--success`. `--button-ink` resolves directly to **`#FFFFFF`**. Intentional duplicate literals, such as white surface and white button text, are valid; changing one role must not automatically change the other. Do not invent slightly different whites or greens merely to make values unique.

## 3. Typography

Use the native system sans stack: `system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`. It needs no download or build step. Keep the root at the user’s normal browser size; all six steps use rem units.

| Step | Size / line height at 16px root | Weight | Use |
| --- | --- | --- | --- |
| 1 | 10.2px / 13.6px | 400; 600 for status words | Captions, context footnotes, chart labels, status pills |
| 2 | 11.9px / 17px | 400; 500 for controls; 600 for table headers | Table body, body text, links, controls |
| 3 | 13.6px / 20.4px | 600 | Section title, drawer heading; `--font-section-title: 0.85rem` |
| 4 | 17px / 23.8px | 600 | Dialog title and wordmark |
| 5 | 20.4px / 27.2px | 600 | Page title |
| 6 | 27.2px / 30.6px | 600 | KPI number |

Apply `font-variant-numeric: tabular-nums lining-nums` to KPI values, dates, times, percentages and numeric table/chart labels. Declare alignment once per column: right-align quantities and left-align text/status fields, applying the same declaration to headers and every body/footer cell. Sort controls inherit column alignment; numeric input values align right. This rule includes chart data tables, Settings editors and drawer tables. Use sentence case, not uppercase table headings. Do not simulate hierarchy with new colours or arbitrary font sizes. Text can wrap; do not clip essential names or shrink type to preserve a row height.

## 4. Spacing, radius and elevation

| Property | Decision |
| --- | --- |
| Spacing scale | 0, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64px; use the corresponding root tokens. |
| Page gutter | 24px on wide screens, 16px below 768px. |
| Section separation | 24px; card interior 20px; related controls 8px; label-to-control 4px. |
| Control height | 36px minimum; text can expand height. Icon-only controls 32×32px minimum. |
| Radius | Controls 8px; cards/drawers/dialogs 12px; status pills 999px. |
| Table | 48px nominal body row, 40px nominal header; 12px horizontal cell padding. Content or zoom may increase height. |
| KPI strip | Single nowrap flex row, equal flexible tiles, minimum tile width 176px; local horizontal scrolling on narrow screens. Never a second row. |
| Elevation | No shadows on cards, KPI tiles, inputs, selected tabs or permanent navigation. Floating menus/tooltips use `--shadow-floating`; overlay drawers/dialogs use `--shadow-dialog`. |

A permanent side-by-side evidence panel is flat and divided by a border. It uses the same drawer header; only the overlay container receives a shadow. Do not create page-specific header variants. Focus uses an outline, not a shadow.

## 5. Shared component specification

### 5.1 State contract

The tables below are exhaustive for visual states. `B` means background, `F` foreground, `E` border and `M` marker. Token names omit `--` only inside these state cells. **No elevation is added by hover or selection.**

**Focus rule R:** retain the underlying state, add `3px solid var(--focus-ring)` outline with `2px` offset. Keep the gap neutral and visible; never attach the brown ring directly to the orange fill. The indicator must not be clipped. A selected control remains selected when focused.

**Disabled rule D:** `B=surface-strong; F=ink-300; E=border`, no marker, no opacity reduction, no hover/pressed styling, no activation. Native disabled controls leave the tab order. For a discoverable `aria-disabled` control, prevent activation in JS and preserve R when keyboard focused. Disabled is an interaction state, never a replacement for an actual session status.

State precedence: disabled interaction rules → focus overlay → pressed → selected → hover → default. Focus on an enabled selected item must not erase selection. All pressed backgrounds are solid.

### 5.2 Actions

| Component | Default | Hover | Active / selected | Focus-visible | Disabled |
| --- | --- | --- | --- | --- | --- |
| Primary button `.button--primary` | B=primary; F=button-ink; E=primary | B/E=primary-hover; F=button-ink | Pressed: same as hover; no toggle-selected state | R over current state | D |
| Secondary button `.button--secondary` | B=surface; F=ink-700; E=border-strong | B=surface-strong; F=ink; E=border-strong | Pressed: B=surface-strong; F=ink; E=ink-500 | R | D |
| Text link `.text-link` | B=transparent; F=primary; underline 1px | F=primary-hover; underline 2px | Pressed: primary-hover; visited remains primary | R; keep underline | F=ink-300; no href/activation; underline remains |

Button geometry: 36px minimum height, 12px horizontal padding, 8px icon gap, 11.9px/17px weight 500, control radius. Links retain an underline; colour alone must not imply clickability. A destructive operation uses explicit wording and its own confirmation flow where required by the product; orange must not imply danger.

### 5.3 Navigation and selection

| Component | Default | Hover | Active / selected | Focus-visible | Disabled |
| --- | --- | --- | --- | --- | --- |
| Segmented option `.segmented__option` | B=transparent on white surface track; F=ink-500; E=transparent | B=surface; F=ink | Selected: B=primary-soft; F=ink; E=primary, 1px; selected hover unchanged; pressed B=spotlight | R around option | D; track unchanged |
| View tab `.view-tab` | B=transparent; F=ink-500; bottom E=transparent, 2px | B=surface-strong; F=ink | Selected: B=transparent; F=ink, weight 600; bottom E=primary; selected hover B=surface-strong; pressed B=spotlight | R inside unclipped tab strip | D text/fill; remove marker |
| Sidebar item `.nav-item` | B=transparent; F=ink-700; left M=transparent, 3px | B=surface-strong; F=ink | Current: B=primary-soft; F=ink; left M=primary; current hover unchanged; pressed B=spotlight | R | D text/fill; remove marker |

Selection rationale: segmentation groups mutually exclusive settings and uses a bounded selected cell; view tabs identify the active panel with an underline; sidebar items identify location with an edge marker. Each treatment is stable within its role. No white floating selected segment, dark filled tab or shadow-based selection is permitted.

Use native radios in a labelled fieldset for segmented values. Use real links with `aria-current="page"` in navigation. Analytics view tabs use `role="tablist"`, `role="tab"`, `aria-selected`, `aria-controls` and a labelled panel. Use arrow keys/Home/End for focus, Enter/Space to activate, and one tab stop in the tablist. Preserve the view in the URL. [WAI tab pattern](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/).

### 5.4 Data and status

| Component | Default | Hover | Active / selected | Focus-visible | Disabled / unavailable |
| --- | --- | --- | --- | --- | --- |
| KPI tile `.kpi-tile` | B=surface; E=border between tiles; label=ink-500; value=ink; optional change=ink-400; explanations in info hint | Unchanged | Not selectable; value remains ink | Tile is not focusable; child link/tooltip uses R | Show “Unavailable” or em dash with the reason in accessible help; no invented zero |
| KPI meter `.meter` | Track=chart-track; fill=chart-primary; visible value label=ink-500 | Unchanged | No selection | Static meter is not focusable | Hide fill for missing data; label “Not enough data” |
| Table row `.data-table tbody tr` | B=surface; F=ink-700; bottom E=border-soft | B=surface-strong | Checked row: B=primary-soft; first-cell left M=primary, 3px; selected hover stays primary-soft | Focus belongs to cell controls; row uses focus-within B=surface-strong unless selected | Preserve row/status data; apply D only to unavailable actions |
| Status `.status` | B=own semantic-soft; F=own semantic-solid; E=transparent; icon + word | Unchanged | No interactive state | Not focusable | Never fade a true status; unavailable state is neutral clock + “Unavailable” |
| Drawer header `.drawer__header` | B=surface; title=ink; context=ink-500; bottom E=border | Unchanged | No selection | Header not focusable in normal flow; close button uses R | Header remains readable; disable only affected actions |

KPI layout is **label with optional info hint → number → optional useful change → optional meter**, with one shared implementation. Put scope, definitions and explanatory subtext in an accessible `.hint-trigger` beside the label. It opens on hover, keyboard focus and touch, and closes on Escape. Do not leave a blank context row when there is no useful change to show. Keep an actual signed delta below the value only when it adds information. Meters are displayed only when a meaningful denominator or defined 0–100 scale exists; an arbitrary count must not get an invented maximum. A favourable score threshold may add a green labelled delta, but never turn the KPI number or whole tile green.

Tables use one header, row, cell-padding and sorting treatment across Sessions, Analytics pivots/details and Settings rules. Use a semantic HTML table, real header buttons with `aria-sort`, labelled selection checkboxes and visible row links. Do not make a whole `<tr>` an unlabelled click target. A selected row is exposed through its checked checkbox; an open driver drawer is exposed by its trigger’s `aria-expanded`, not inferred from colour. A pivot adds data columns and totals using the same cell classes, not another visual table style.

Status pills use 10.2px/13.6px weight 600, 4px vertical and 8px horizontal padding, 4px icon gap, 16px icons. Colour the icon with `currentColor`. Decorative status SVGs use `aria-hidden="true"` because the adjacent word provides the accessible name.

Drawer header: 20px padding, 13.6px/20.4px title, 10.2px/13.6px context, 32px close target. Modal drawers move focus inside, contain focus, close on Escape and return focus to the invoker; background content is inert. A persistent evidence drawer is a labelled complementary region and does not trap focus. [WAI modal dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/).

### 5.5 Inputs and help

| Component | Default | Hover | Active / selected | Focus-visible | Disabled |
| --- | --- | --- | --- | --- | --- |
| Info hint `.hint-trigger` | B=transparent; F=ink-500; E=transparent; 32px target | B=surface-strong; F=ink | Open/pressed: B=surface-strong; F=ink | R; show tooltip | D; required explanatory text remains available outside tooltip |
| Filter `.filter-control` | B=surface; F=ink-700; E=border-strong | B=surface-strong; F=ink | Applied: B=primary-soft; F=ink; E=primary; count + clear label; pressed B=spotlight | R | D |
| Search `.search-control` | B=surface; F=ink-700; E=border-strong; placeholder=ink-300 | E=ink-500; fill unchanged | While editing: B=surface; F=ink; E=border-strong; non-empty is not orange-selected | R | D |

Use a persistent visible label for search and filters; placeholders are examples, not labels. Search remains white while populated. Filters have an explicit applied count and a labelled clear control. All errors use `--rust` border plus a written error linked with `aria-describedby`; the normal focus outline remains visible.

Tooltip: surface background, ink-700 text, border, floating shadow, control radius, 10.2px/13.6px text, 8px padding, maximum width 280px. Show on hover and focus; support click for touch, Escape to dismiss and pointer movement into the tooltip without premature disappearance. Keep it noninteractive; use a popover for interactive content. [WAI tooltip pattern](https://www.w3.org/WAI/ARIA/apg/patterns/tooltip/); [WCAG content on hover or focus](https://www.w3.org/WAI/WCAG22/Understanding/content-on-hover-or-focus.html).

### 5.6 Screen composition contract

| Screen | Composition using the same shared classes |
| --- | --- |
| Automation Centre | Page header → one KPI strip → Needs you this week → Automation this week. Exception rows explain the required human decision; automated activity is neutral. |
| Sessions | One KPI strip → filter/search toolbar → shared table with State, Attention, Method and due date → pagination. |
| Session workspace | One KPI strip, using relevant session measures → neutral conversation panel → same evidence drawer header. Inbound/outbound bubbles use surface/surface-soft and author labels, never brand tint. |
| Analytics: Outcomes | One KPI strip → before/after chart → detail table. |
| Analytics: Activity | Same strip → full-width weekly grouped bars plus score line → one combined program table with record counts, coaching states/methods, event rate and signed change. Do not repeat Program pivot and Program performance tables. |
| Analytics: Drivers / Groups | Same strip → shared pivot/detail table → driver spotlight drawer with the shared header. |
| Content library | One KPI strip with meaningful library measures → shared filter/search → neutral content cards using the same card shell. |
| Settings | One KPI strip with real automation configuration measures → automation-mode radio segment → cadence controls → shared event-type rules table. |

Do not invent data to populate a strip: use a labelled unavailable state where necessary. Only content and data bindings vary by screen. No `.analytics .kpi-tile`, `.settings .data-table` or page-scoped token overrides.

## 6. Chart system

### Fixed anatomy

Every chart follows **title → concise context → legend → plot → collapsed Summary and data**. Use the same `.chart-card` shell. Title: 13.6px/20.4px weight 600. Context/legend/labels/source detail: 10.2px/13.6px. Gaps: 4px title-to-context, 12px context-to-legend, 12px legend-to-plot, and 12px plot-to-summary. Keep the unit, comparison window and essential reading direction concise and visible. Put long source notes, update time, denominator and exclusions inside the collapsed summary, alongside findings and the equivalent data table. A useful signed change may remain below the plot. Summary control starts “Summary and data”, remains available to keyboard and screen-reader users and is closed initially.

| Element | Exact rule |
| --- | --- |
| Plot background | `--surface`; no gradient, area wash or tinted card. |
| Axis line / ticks | `--border-strong`, 1px. |
| Gridlines | `--border-soft`, 1px, supporting only; show at most five major horizontal/vertical value guides. |
| Axis and data labels | `--ink-500`, 10.2px/13.6px; selected data labels `--ink`; values outside bars. |
| Bars | Zero baseline; 12px thickness for horizontal comparisons, 4px paired-bar gap, 16px between behaviour groups; square baseline and at most 2px end rounding. |
| Ordinary lines | 2px stroke; no smoothing that creates unobserved values. Comparison is dashed 4px/4px. |
| Score line | `--chart-score`, 2.5px stroke, over a 6px white casing; 6px white-filled circles with 2px ink stroke. |
| Legend | Series name + swatch showing the actual bar/line/dash/marker shape; same order as the plot. No orange legend state. |
| Plot selection | Retain original series colour; add an ink outline and visible datum label. Focus adds the shared outer focus indicator only to the interactive target. |
| Chart tooltip | Shared tooltip surface; series name, exact value, unit and date in words. Keyboard users receive the same data. |

Plot marks must remain distinct from their adjacent background. `--chart-baseline` exceeds 3:1 on white, but is only 2.90:1 against `--chart-track`: **draw the grey before bars on white, not over a grey track**. Meter tracks are decorative and supported by printed values. Where lines cross bars, white casing separates the score line from the fills; without casing its contrast against petrol would be inadequate.

### Before/after outcomes

For each behaviour, draw **two adjacent horizontal bars sharing the same zero-based scale**: Before in baseline grey, After in petrol. Keep Before above After everywhere. Place exact values at their ends and a separate change column: for example, **“↓ 31% fewer”** in success or **“↑ 12% more”** in danger. These examples are illustrative, not fleet results. Each behaviour is named once at the left; the two bars also retain explicit Before/After labels.

Compare exposure-normalized rates, such as events per 1,000 km, within the same driver cohort and defined windows. State distance and driver counts. If the starting rate is zero, show absolute change and “Percentage change unavailable”; if exposure is insufficient, show “Not enough data” rather than zero. Do not label an observational before/after difference as a proven causal coaching effect. Do not use a diverging chart whose leftward bars require the reader to decode whether left means worse or improved.

### Weekly activity and secondary score axis

Use petrol bars for automated sessions and umber bars for one-on-one sessions, side by side for each week. Both are neutral activity categories, independent of success/status pill colours. Left axis: “Sessions”, starting at zero. Right axis: “Safety score / 100”, fixed 0–100. Score is the cased ink line with circle markers; never orange, green or a filled area. Add “Bars use left axis; score uses right axis” to the context line and name the axis in the legend. Keep week positions aligned. Do not adjust the right-axis range to exaggerate agreement with volume, and do not imply a causal relationship between the two.

Categorical chart identity and outcome meaning are separate modes. The only semantic colouring in a magnitude comparison is the signed change label; if a dedicated delta chart is added, its bars may use reduction/increase semantics with explicit signs and labels. Never recolour all After bars green regardless of their actual direction.

## 7. Accessibility and verification

### Measured foreground/background pairs

| Pair | Foreground / background | Ratio | Result |
| --- | --- | ---: | --- |
| White primary-button text | `#FFFFFF` / `#B84A00` | 5.23:1 | AA normal text |
| White hover-button text | `#FFFFFF` / `#963C00` | 7.14:1 | AA normal text |
| Link on white | `#B84A00` / `#FFFFFF` | 5.23:1 | AA normal text |
| Link on primary-soft | `#B84A00` / `#FFF2E8` | 4.76:1 | AA normal text |
| Orange text on spotlight — prohibited | `#B84A00` / `#FFE2CC` | 4.23:1 | FAIL normal text |
| Selected text on spotlight | `#18212F` / `#FFE2CC` | 13.10:1 | AA normal text |
| Success pill | `#216E47` / `#EAF5EE` | 5.55:1 | AA normal text |
| Warning pill | `#7A5900` / `#FFF4D6` | 5.88:1 | AA normal text |
| Danger pill | `#B02A46` / `#FCECF0` | 5.63:1 | AA normal text |
| Reply pill | `#7047A3` / `#F2EDF9` | 5.85:1 | AA normal text |
| Automated pill | `#596675` / `#EDF0F4` | 5.13:1 | AA normal text |
| Required control outline on strongest neutral | `#7F8B9A` / `#F3F5F7` | 3.17:1 | Pass non-text |
| Petrol chart mark on white | `#236C72` / `#FFFFFF` | 6.07:1 | Pass non-text |
| Before bar on white | `#7D8795` / `#FFFFFF` | 3.64:1 | Pass non-text |
| Before bar on track — prohibited | `#7D8795` / `#E1E6ED` | 2.90:1 | FAIL non-text if essential |
| Score line against white casing | `#364152` / `#FFFFFF` | 10.32:1 | Pass non-text |

The normal-text requirement is at least 4.5:1, large-text minimum is 3:1, and required UI boundaries/graphical information need at least 3:1 against their adjacent colour. Decorative separators are not substitutes for essential boundaries. These palette results establish colour-pair compliance, not whole-product WCAG conformance. [Text contrast](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html); [non-text contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html).

Use the shared **3px outer outline with 2px offset** on every interactive component. On the four neutrals the ring contrast ranges from 8.72:1 to 9.88:1. Keep focus outside the orange button with a neutral gap, and use scroll padding so sticky headers do not cover it. WCAG AA requires visible, unobscured focus; the ring’s deliberate area specification also follows the stronger AAA Focus Appearance guidance. [Focus visible](https://www.w3.org/WAI/WCAG22/Understanding/focus-visible.html); [focus not obscured](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html); [focus appearance](https://www.w3.org/WAI/WCAG22/Understanding/focus-appearance.html).

| Concern | Required behaviour |
| --- | --- |
| Colour-independent status | Icon shape and visible word always present; no dot-only status or red/green-only outcome. |
| Reduced motion | Under `prefers-reduced-motion: reduce`, remove transitions/animations and smooth scrolling. Charts render in their final state; no count-up or sweeping meter animation. |
| Pointer targets | Ordinary controls at least 36px high; standalone icons at least 32×32px. Inline prose links retain normal text flow. [WCAG target size](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html). |
| Keyboard | Native form controls; labelled sort and drawer buttons; no hover-only actions; logical focus order. |
| Zoom/reflow | At 200% text zoom and a 320 CSS-pixel viewport, content remains usable. Only KPI/table/plot containers scroll horizontally; the page itself must not overflow. KPI tiles stay on one row. |
| Data alternatives | Each chart has a concise accessible name, equivalent table, exact values, units and relevant exclusions in Summary and data. |
| Missing / loading / error | Use explicit words. A missing value is not zero. Use a quiet static loading label; errors state the failed operation and recovery action. |
| High contrast | Support `forced-colors`; retain borders, selected markers, icons, labels and system focus outline. Do not disable forced colour adaptation. |
| Announcements | Announce search result counts and save outcomes with restrained `aria-live="polite"`; never announce every refresh or every decorative icon. |

### Release checks

Check one shared specimen containing all five states, then representative uses in all listed screens. Verify keyboard traversal, search/filter labels, drawer focus return, 200% text zoom, narrow viewport scrolling, reduced motion, forced colours and charts without colour. Inspect the CSS for undeclared colours, root aliases, gradients, non-floating shadows and page-specific shared-component overrides. Recalculate affected contrast pairs whenever a token changes. Do not claim colour-blind safety from ΔE alone.

## 8. Do / Don’t gallery — ten implementation pairs

| # | Don’t | Do |
| --- | --- | --- |
| 1 | Apply orange gradients to insight cards or the canvas. | Canvas `#FAFBFD`; card `#FFFFFF`; one `--border` edge. |
| 2 | Repaint the whole app when the brand accent changes. | Change the explicit brand role; keep neutral, semantic and data roles independently defined. |
| 3 | Set `--green: var(--primary)` or `--button-ink: var(--primary)`. | Literal success green `#216E47`; literal button white `#FFFFFF`. |
| 4 | Give Overdue, Needs review and Repeated three close orange/red badges. | Crimson octagon “Overdue”; ochre triangle “Needs review”; ochre repeat icon “Repeated”. |
| 5 | Make Automated green and One-on-one alarming red. | Both method labels are slate; State and Attention express their actual meanings separately. |
| 6 | Alternate dark selected fills, floating white tabs and inset shadows. | Use the fixed bounded segment, underlined tab and edge-marked navigation states. |
| 7 | Colour KPI values, chart bars, links and buttons orange. | Ink figures; petrol quantity marks; orange actions; signed semantic deltas. |
| 8 | Wrap six KPI tiles into a second row or shrink their labels. | One nowrap strip with 176px minimum tiles and local horizontal scrolling. |
| 9 | Give Analytics denser rows and Settings larger, differently tinted tables. | One 48px nominal row, shared padding/type, neutral header and common states. |
| 10 | Use a green After bar or dual-axis line as proof of improvement. | Grey Before / petrol After with printed rates; signed change label; cased ink score line and explicit axes. |

## 9. Implementation appendix

### 9.1 Drop-in CSS

The block below contains the complete root token set and shared component classes. Root declarations are literal; components use role tokens. The only shadows are attached to floating overlays. Content, state and data attributes vary; page-specific CSS variants do not.

```css
:root {
  color-scheme: light;
  /* Literal role values. Never alias one root token to another. */
  --canvas: #FAFBFD;
  --surface: #FFFFFF;
  --surface-soft: #FCFDFE;
  --surface-strong: #F3F5F7;
  --ink: #18212F;
  --ink-700: #364152;
  --ink-500: #4F5D70;
  --ink-400: #59697C;
  --ink-300: #606E80;
  --border: #DEE4EB;
  --border-soft: #EEF1F5;
  --border-strong: #7F8B9A;
  --primary: #B84A00;
  --primary-hover: #963C00;
  --primary-soft: #FFF2E8;
  --spotlight: #FFE2CC;
  --button-ink: #FFFFFF;
  --success: #216E47;
  --success-soft: #EAF5EE;
  --amber: #7A5900;
  --amber-soft: #FFF4D6;
  --rust: #B02A46;
  --rust-soft: #FCECF0;
  --violet: #7047A3;
  --violet-soft: #F2EDF9;
  --automated: #596675;
  --automated-soft: #EDF0F4;
  --green: #216E47; /* Deprecated compatibility token; use --success. */
  --focus-ring: #713000;
  --chart-primary: #236C72;
  --chart-secondary: #8A5A44;
  --chart-tertiary: #8B4F7D;
  --chart-quaternary: #64743A;
  --chart-baseline: #7D8795;
  --chart-track: #E1E6ED;
  --chart-score: #364152;
  --chart-reduction: #216E47;
  --chart-increase: #B02A46;
  --chart-unchanged: #596675;

  --font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  --font-1: 0.6375rem;
  --font-2: 0.74375rem;
  --font-3: 0.85rem;
  --font-4: 1.0625rem;
  --font-5: 1.275rem;
  --font-6: 1.7rem;
  --line-1: 0.85rem;
  --line-2: 1.0625rem;
  --line-3: 1.275rem;
  --line-4: 1.4875rem;
  --line-5: 1.7rem;
  --line-6: 1.9125rem;
  --font-section-title: 0.85rem;
  --weight-body: 400;
  --weight-control: 500;
  --weight-heading: 600;

  --space-0: 0;
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-5: 1.25rem;
  --space-6: 1.5rem;
  --space-8: 2rem;
  --space-10: 2.5rem;
  --space-12: 3rem;
  --space-16: 4rem;
  --radius-control: 0.5rem;
  --radius-card: 0.75rem;
  --radius-pill: 999px;
  --control-height: 2.25rem;
  --icon-target: 2rem;
  --row-height: 3rem;
  --table-header-height: 2.5rem;
  --kpi-min-width: 11rem;
  --focus-width: 3px;
  --focus-offset: 2px;
  --transition-duration: 120ms;
  --transition-easing: ease-out;
  --shadow-floating: 0 8px 24px rgba(24, 33, 47, 0.12);
  --shadow-dialog: 0 16px 48px rgba(24, 33, 47, 0.18);
  --scrim: rgba(24, 33, 47, 0.32);
}

* { box-sizing: border-box; }
html { scroll-padding-block: var(--space-16); }
body {
  margin: 0;
  background: var(--canvas);
  color: var(--ink-700);
  font: var(--weight-body) var(--font-2)/var(--line-2) var(--font-family);
}
button, input, select, textarea { font: inherit; }
button { cursor: pointer; }
[hidden] { display: none !important; }
.page { min-inline-size: 0; padding: var(--space-6); }
.stack { display: grid; gap: var(--space-6); min-inline-size: 0; }
.toolbar { display: flex; flex-wrap: wrap; gap: var(--space-2); align-items: end; }
.card {
  min-inline-size: 0;
  padding: var(--space-5);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-card);
}
.page-title {
  margin: 0;
  color: var(--ink);
  font-size: var(--font-5);
  line-height: var(--line-5);
  font-weight: var(--weight-heading);
}
.section-title {
  margin: 0;
  color: var(--ink);
  font-size: var(--font-section-title);
  line-height: var(--line-3);
  font-weight: var(--weight-heading);
}
.caption { font-size: var(--font-1); line-height: var(--line-1); color: var(--ink-400); }
.num { font-variant-numeric: tabular-nums lining-nums; }
.icon { inline-size: 1rem; block-size: 1rem; flex: 0 0 1rem; }
.brand { display: flex; align-items: center; gap: var(--space-2); color: var(--ink); }
.brand__mark { inline-size: 1.5rem; block-size: 1.5rem; color: var(--primary); }
.brand__name { font-size: var(--font-4); line-height: var(--line-4); font-weight: 600; }
.brand__descriptor { color: var(--ink-500); font-size: var(--font-1); line-height: var(--line-1); }

:where(button, a[href], input, select, textarea, summary, [tabindex]):focus-visible {
  outline: var(--focus-width) solid var(--focus-ring);
  outline-offset: var(--focus-offset);
  scroll-margin-block: var(--space-16);
}
.button, .view-tab, .nav-item, .segmented__option,
.filter-control, .search-control, .hint-trigger, .text-link {
  transition: color var(--transition-duration) var(--transition-easing),
    background-color var(--transition-duration) var(--transition-easing),
    border-color var(--transition-duration) var(--transition-easing);
}
.button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  min-block-size: var(--control-height);
  padding: var(--space-2) var(--space-3);
  border: 1px solid transparent;
  border-radius: var(--radius-control);
  font-weight: var(--weight-control);
  text-decoration: none;
}
.button--icon {
  min-inline-size: var(--icon-target); min-block-size: var(--icon-target);
  padding: var(--space-1);
}
.button--primary { background: var(--primary); border-color: var(--primary); color: var(--button-ink); }
.button--primary:where(:hover, :active) {
  background: var(--primary-hover); border-color: var(--primary-hover);
}
.button--secondary { background: var(--surface); border-color: var(--border-strong); color: var(--ink-700); }
.button--secondary:where(:hover) { background: var(--surface-strong); color: var(--ink); }
.button--secondary:where(:active) {
  background: var(--surface-strong); color: var(--ink); border-color: var(--ink-500);
}
.text-link { color: var(--primary); text-decoration: underline; text-decoration-thickness: 1px; text-underline-offset: 3px; }
.text-link:where(:visited) { color: var(--primary); }
.text-link:where(:hover, :active) { color: var(--primary-hover); text-decoration-thickness: 2px; }

.segmented {
  display: inline-flex;
  flex-wrap: nowrap;
  gap: var(--space-1);
  margin: 0;
  padding: var(--space-2);
  min-inline-size: 0;
  max-inline-size: 100%;
  overflow-x: auto;
  background: var(--surface);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-control);
}
.segmented legend { color: var(--ink-500); font-size: var(--font-2); padding-inline: var(--space-1); }
.segmented label { position: relative; display: inline-flex; flex: 0 0 auto; }
.segmented input {
  position: absolute; inline-size: 1px; block-size: 1px;
  overflow: hidden; clip-path: inset(50%); white-space: nowrap;
}
.segmented__option {
  display: inline-flex; align-items: center; justify-content: center;
  min-block-size: var(--control-height);
  padding: var(--space-2) var(--space-3);
  border: 1px solid transparent;
  border-radius: var(--radius-control);
  background: transparent; color: var(--ink-500); cursor: pointer;
}
.segmented__option:where(:hover) { background: var(--surface); color: var(--ink); }
.segmented :where(input:checked) + .segmented__option {
  background: var(--primary-soft); color: var(--ink); border-color: var(--primary);
}
.segmented__option:where(:active),
.segmented :where(input:checked) + .segmented__option:where(:active) { background: var(--spotlight); color: var(--ink); }
.segmented :where(input:focus-visible) + .segmented__option {
  outline: var(--focus-width) solid var(--focus-ring); outline-offset: var(--focus-offset);
}
.view-tabs {
  display: flex; flex-wrap: nowrap; gap: var(--space-1);
  padding: var(--space-2); overflow-x: auto;
  border-block-end: 1px solid var(--border); min-inline-size: 0;
}
.view-tab {
  flex: 0 0 auto; min-block-size: var(--control-height);
  padding: var(--space-2) var(--space-3);
  background: transparent; color: var(--ink-500);
  border: 0; border-block-end: 2px solid transparent;
  border-radius: 0; font-weight: var(--weight-control);
}
.view-tab:where(:hover) { background: var(--surface-strong); color: var(--ink); }
.view-tab:where([aria-selected="true"]) {
  background: transparent; color: var(--ink);
  border-block-end-color: var(--primary); font-weight: var(--weight-heading);
}
.view-tab:where([aria-selected="true"]:hover) { background: var(--surface-strong); }
.view-tab:where(:active) { background: var(--spotlight); color: var(--ink); }
.nav-item {
  display: flex; align-items: center; gap: var(--space-2);
  min-block-size: var(--control-height); padding: var(--space-2) var(--space-3);
  border-inline-start: 3px solid transparent; border-radius: var(--radius-control);
  background: transparent; color: var(--ink-700); text-decoration: none;
}
.nav-item:where(:hover) { background: var(--surface-strong); color: var(--ink); }
.nav-item:where([aria-current="page"]) {
  background: var(--primary-soft); color: var(--ink); border-inline-start-color: var(--primary);
}
.nav-item:where(:active) { background: var(--spotlight); color: var(--ink); }

.kpi-strip {
  display: flex; flex-wrap: nowrap; align-items: stretch;
  min-inline-size: 0; max-inline-size: 100%; overflow-x: auto;
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--radius-card);
}
.kpi-tile { flex: 1 0 var(--kpi-min-width); min-inline-size: var(--kpi-min-width); padding: var(--space-5); background: var(--surface); }
.kpi-tile + .kpi-tile { border-inline-start: 1px solid var(--border); }
.kpi-label { margin: 0 0 var(--space-2); color: var(--ink-500); }
.kpi-value {
  margin: 0; color: var(--ink); font-size: var(--font-6); line-height: var(--line-6);
  font-weight: var(--weight-heading); font-variant-numeric: tabular-nums lining-nums;
}
.kpi-label { display: flex; align-items: center; gap: var(--space-1); }
.kpi-context:empty { display: none; }
.kpi-context { margin-block: var(--space-2); color: var(--ink-400); font-size: var(--font-1); line-height: var(--line-1); }
.meter { block-size: var(--space-2); background: var(--chart-track); overflow: hidden; border-radius: var(--radius-pill); }
.meter__fill { block-size: 100%; background: var(--chart-primary); }
.meter-label { color: var(--ink-500); font-size: var(--font-1); line-height: var(--line-1); }
.delta--favourable { color: var(--chart-reduction); }
.delta--adverse { color: var(--chart-increase); }
.delta--unchanged { color: var(--chart-unchanged); }

.table-scroll { min-inline-size: 0; max-inline-size: 100%; overflow: auto; border: 1px solid var(--border); border-radius: var(--radius-card); }
.data-table { inline-size: 100%; min-inline-size: 48rem; border-collapse: separate; border-spacing: 0; background: var(--surface); }
.data-table caption { padding: var(--space-3); color: var(--ink); text-align: start; font-weight: var(--weight-heading); }
.data-table th, .data-table td {
  padding: var(--space-3); border-block-end: 1px solid var(--border-soft);
  color: var(--ink-700); text-align: start; vertical-align: middle;
}
.data-table thead th { height: var(--table-header-height); padding-block: var(--space-2); background: var(--surface-soft); color: var(--ink-500); font-weight: var(--weight-heading); }
.data-table tbody th, .data-table tbody td { height: var(--row-height); }
.data-table tbody th { background: inherit; color: var(--ink-700); }
.data-table .num { text-align: end; font-variant-numeric: tabular-nums lining-nums; }
.data-table tbody tr { background: var(--surface); }
.data-table tbody tr:where(:hover, :focus-within) { background: var(--surface-strong); }
.data-table tbody tr:where([data-selected="true"]) { background: var(--primary-soft); }
.data-table tbody :is(th, td):first-child { border-inline-start: 3px solid transparent; }
.data-table tbody tr:where([data-selected="true"]) :is(th, td):first-child { border-inline-start-color: var(--primary); }
.data-table tbody tr:last-child :is(th, td) { border-block-end: 0; }
.table-sort {
  display: inline-flex; align-items: center; gap: var(--space-1);
  min-block-size: var(--icon-target); padding: 0; background: transparent;
  color: inherit; border: 0; font-weight: var(--weight-heading);
}
.table-sort:where(:hover, :active) { color: var(--ink); text-decoration: underline; }
.data-table input[type="checkbox"] {
  appearance: none; display: inline-grid; place-content: center;
  inline-size: 1rem; block-size: 1rem; margin: 0;
  border: 1px solid var(--border-strong); border-radius: 4px;
  background: var(--surface); color: var(--button-ink); cursor: pointer;
}
.data-table input[type="checkbox"]::before {
  content: ""; inline-size: 8px; block-size: 4px;
  border-inline-start: 2px solid currentColor;
  border-block-end: 2px solid currentColor;
  transform: rotate(-45deg) scale(0);
}
.data-table input[type="checkbox"]:where(:checked, :indeterminate) {
  background: var(--primary); border-color: var(--primary);
}
.data-table input[type="checkbox"]:where(:checked)::before { transform: rotate(-45deg); }
.data-table input[type="checkbox"]:where(:indeterminate)::before {
  border-inline-start: 0; block-size: 0; transform: none;
}
.data-table input[type="checkbox"]:where(:disabled) {
  background: var(--surface-strong); color: var(--ink-300);
  border-color: var(--border); cursor: not-allowed;
}
.check-target { display: inline-flex; align-items: center; justify-content: center; min-inline-size: var(--icon-target); min-block-size: var(--icon-target); }
.status {
  display: inline-flex; align-items: center; gap: var(--space-1);
  padding: var(--space-1) var(--space-2); border: 1px solid transparent;
  border-radius: var(--radius-pill); font-size: var(--font-1); line-height: var(--line-1);
  font-weight: var(--weight-heading); white-space: nowrap;
  color: var(--automated); background: var(--automated-soft);
}
.status[data-tone="success"] { color: var(--success); background: var(--success-soft); }
.status[data-tone="warning"] { color: var(--amber); background: var(--amber-soft); }
.status[data-tone="danger"] { color: var(--rust); background: var(--rust-soft); }
.status[data-tone="reply"] { color: var(--violet); background: var(--violet-soft); }
.status[data-tone="neutral"] { color: var(--automated); background: var(--automated-soft); }

.drawer { background: var(--surface); color: var(--ink-700); border: 1px solid var(--border); border-radius: var(--radius-card); min-inline-size: 0; }
.drawer__header { display: flex; align-items: start; justify-content: space-between; gap: var(--space-3); padding: var(--space-5); background: var(--surface); border-block-end: 1px solid var(--border); }
.drawer__title { margin: 0; color: var(--ink); font-size: var(--font-section-title); line-height: var(--line-3); font-weight: var(--weight-heading); }
.drawer__context { margin: var(--space-1) 0 0; color: var(--ink-500); font-size: var(--font-1); line-height: var(--line-1); }
.drawer__body { padding: var(--space-5); }
.dialog { padding: 0; inline-size: min(40rem, calc(100% - 2rem)); max-block-size: calc(100dvh - 2rem); overflow: auto; background: var(--surface); color: var(--ink-700); border: 1px solid var(--border); border-radius: var(--radius-card); box-shadow: var(--shadow-dialog); }
.dialog.drawer { margin: 0 0 0 auto; inline-size: min(32rem, 100%); block-size: 100dvh; max-block-size: 100dvh; border-radius: var(--radius-card) 0 0 var(--radius-card); }
.dialog::backdrop { background: var(--scrim); }
.floating-panel { padding: var(--space-2); background: var(--surface); color: var(--ink-700); border: 1px solid var(--border); border-radius: var(--radius-control); box-shadow: var(--shadow-floating); }
.hint-trigger {
  display: inline-flex; align-items: center; justify-content: center;
  min-inline-size: var(--icon-target); min-block-size: var(--icon-target);
  padding: var(--space-1); background: transparent; color: var(--ink-500);
  border: 1px solid transparent; border-radius: var(--radius-control);
}
.hint-trigger:where(:hover, :active, [data-open="true"]) { background: var(--surface-strong); color: var(--ink); }
.tooltip { position: fixed; z-index: 100; max-inline-size: 17.5rem; padding: var(--space-2); background: var(--surface); color: var(--ink-700); border: 1px solid var(--border); border-radius: var(--radius-control); box-shadow: var(--shadow-floating); font-size: var(--font-1); line-height: var(--line-1); }
.field { display: grid; gap: var(--space-1); min-inline-size: 0; }
.field-label { color: var(--ink-500); }
.filter-control, .search-control {
  min-block-size: var(--control-height); min-inline-size: 0; max-inline-size: 100%;
  padding: var(--space-2) var(--space-3); background: var(--surface); color: var(--ink-700);
  border: 1px solid var(--border-strong); border-radius: var(--radius-control);
}
.filter-control { display: inline-flex; align-items: center; gap: var(--space-2); }
.filter-control:where(:hover) { background: var(--surface-strong); color: var(--ink); }
.filter-control:where([data-applied="true"]) { background: var(--primary-soft); color: var(--ink); border-color: var(--primary); }
.filter-control:where(:active) { background: var(--spotlight); color: var(--ink); }
.search-control::placeholder { color: var(--ink-300); opacity: 1; }
.search-control:where(:hover) { border-color: var(--ink-500); }
.search-control:where(:focus) { background: var(--surface); color: var(--ink); border-color: var(--border-strong); }
.search-control:where([aria-invalid="true"]), .filter-control:where([aria-invalid="true"]) { border-color: var(--rust); }
.field-error { color: var(--rust); font-size: var(--font-1); line-height: var(--line-1); }

/* Late disabled rules override hover/pressed/selected without changing focus. */
.button:where(:disabled, [aria-disabled="true"]),
.view-tab:where(:disabled, [aria-disabled="true"]),
.nav-item:where([aria-disabled="true"]),
.filter-control:where(:disabled, [aria-disabled="true"]),
.search-control:where(:disabled, [aria-disabled="true"]),
.hint-trigger:where(:disabled, [aria-disabled="true"]) {
  background: var(--surface-strong); color: var(--ink-300);
  border-color: var(--border); cursor: not-allowed; opacity: 1;
}
.view-tab:where(:disabled, [aria-disabled="true"]) { border-block-end-color: transparent; }
.nav-item:where([aria-disabled="true"]) { border-inline-start-color: transparent; }
.segmented :where(input:disabled) + .segmented__option {
  background: var(--surface-strong); color: var(--ink-300); border-color: var(--border); cursor: not-allowed;
}
.text-link:where([aria-disabled="true"]) { color: var(--ink-300); cursor: not-allowed; text-decoration-thickness: 1px; }

.chart-card { min-inline-size: 0; padding: var(--space-5); background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-card); }
.chart-title { margin: 0; font-size: var(--font-section-title); line-height: var(--line-3); font-weight: var(--weight-heading); color: var(--ink); }
.chart-context { margin: var(--space-1) 0 0; font-size: var(--font-1); line-height: var(--line-1); color: var(--ink-500); }
.chart-legend { display: flex; flex-wrap: wrap; gap: var(--space-3); margin-block: var(--space-3); font-size: var(--font-1); line-height: var(--line-1); color: var(--ink-500); }
.chart-plot { min-inline-size: 0; overflow-x: auto; background: var(--surface); }
.chart-plot svg { display: block; font-family: var(--font-family); }
.chart-axis { stroke: var(--border-strong); stroke-width: 1; }
.chart-grid { stroke: var(--border-soft); stroke-width: 1; }
.chart-label { fill: var(--ink-500); font-size: var(--font-1); font-variant-numeric: tabular-nums lining-nums; }
.chart-bar--primary { fill: var(--chart-primary); }
.chart-bar--secondary { fill: var(--chart-secondary); }
.chart-bar--tertiary { fill: var(--chart-tertiary); }
.chart-bar--quaternary { fill: var(--chart-quaternary); }
.chart-bar--baseline { fill: var(--chart-baseline); }
.chart-line { fill: none; stroke: var(--chart-primary); stroke-width: 2; }
.chart-line--baseline { fill: none; stroke: var(--chart-baseline); stroke-width: 2; stroke-dasharray: 4 4; }
.chart-score-casing { fill: none; stroke: var(--surface); stroke-width: 6; }
.chart-score-line { fill: none; stroke: var(--chart-score); stroke-width: 2.5; }
.chart-score-marker { fill: var(--surface); stroke: var(--chart-score); stroke-width: 2; }
.chart-mark:where(rect[data-selected="true"]) { stroke: var(--ink); stroke-width: 2; }
.chart-datum-highlight { fill: none; stroke: var(--ink); stroke-width: 2; }
.chart-footnote { margin: var(--space-2) 0 0; font-size: var(--font-1); line-height: var(--line-1); color: var(--ink-400); }
.chart-summary { margin-block-start: var(--space-3); border-block-start: 1px solid var(--border); padding-block-start: var(--space-2); }
.chart-summary summary { min-block-size: var(--control-height); padding: var(--space-2); color: var(--ink-700); cursor: pointer; }
.chart-summary summary:where(:hover) { background: var(--surface-strong); color: var(--ink); }

@media (max-width: 48rem) { .page { padding: var(--space-4); } }
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation: none !important; transition: none !important; scroll-behavior: auto !important; }
}
@media (forced-colors: active) {
  :where(button, a[href], input, select, textarea, summary, [tabindex]):focus-visible {
    outline-color: Highlight;
  }
  .segmented :where(input:focus-visible) + .segmented__option { outline-color: Highlight; }
  .segmented :where(input:checked) + .segmented__option { border-color: Highlight; }
  .view-tab:where([aria-selected="true"]) { border-block-end-color: Highlight; }
  .nav-item:where([aria-current="page"]) { border-inline-start-color: Highlight; }
  .filter-control:where([data-applied="true"]) { border-color: Highlight; }
  .data-table tbody tr:where([data-selected="true"]) :is(th, td):first-child { border-inline-start-color: Highlight; }
  .status { border-color: CanvasText; }
  .chart-line, .chart-line--baseline, .chart-score-line, .chart-axis { stroke: CanvasText; }
  .chart-score-marker { fill: Canvas; }
  .chart-score-casing { fill: none; stroke: Canvas; }
  .chart-score-marker { stroke: CanvasText; }
  .chart-label { fill: CanvasText; }
  .data-table input[type="checkbox"] { border-color: ButtonText; }
  .data-table input[type="checkbox"]:where(:checked, :indeterminate) {
    background: Highlight; color: HighlightText; border-color: Highlight;
  }
}
```

### 9.2 DOM and small-JavaScript contract

Use `.button.button--primary` and `.button.button--secondary` on native buttons. The drawer close control uses `.button.button--secondary.button--icon` with an accessible “Close” label; `button--icon` changes geometry only, retaining the secondary-button states. A segmented control is a `.segmented` fieldset with labelled radio inputs immediately followed by `.segmented__option` spans. Group related values under a real legend. A tab is a `.view-tab` button with the ARIA attributes specified above; JS updates selected state, the active tab stop, panel visibility and URL together.

The `.kpi-strip` is a labelled section, containing `.kpi-tile` articles. Explanatory context belongs in an accessible info hint beside each label; `.kpi-context` is optional and reserved for a useful visible change, not an empty spacer. Give a horizontally overflowing strip `tabindex="0"` and an accessible label so keyboard users can scroll it. A meter is a wrapper with `role="meter"`, `aria-valuemin`, `aria-valuemax`, `aria-valuenow` and a descriptive label; its `.meter__fill` child gets a clamped percentage width from data. Omit the meter semantics and fill when the value is missing. Dynamic data widths are permitted; inline colours are not.

Each table lives in a labelled `.table-scroll` region. JS synchronizes a selected checkbox with its row’s `data-selected="true"`; it does not replace native table semantics with an unnecessary ARIA grid. Use column descriptors such as `{ label: "Safety score", numeric: true }`; the shared renderer propagates `.num` to the header and matching body/footer cells. Text/status columns remain unmarked and left-aligned. Do not infer alignment from incidental displayed text or maintain independent header/body rules. Sorting uses a real header button and updates `aria-sort` on the relevant header. Keep the selection edge marker decorative because the checkbox announces selection.

A `.status` receives one `data-tone`: `success`, `warning`, `danger`, `reply` or `neutral`. Status words and icons come from one dictionary shared by tables, drawers and activity items. The dictionary governs State, Attention and Method separately. No page writes a new status colour.

Use a `.drawer` labelled complementary region for persistent evidence and a native `.dialog` dialog opened modally for overlay workspace panels. Their header is always `.drawer__header`. Native modal behaviour supplies the focus boundary; JS records and restores the invoker and implements the close button. Trigger buttons expose expanded state.

A filter button adds `data-applied="true"` when values are applied. Search is a labelled native `input type="search"` with `.search-control`. For `aria-disabled="true"`, JS must block click and keyboard activation; CSS alone does not disable an action. Tooltips receive an ID referenced with `aria-describedby`; implement the pointer/focus/Escape behaviour from section 5.5.

Charts use accessible SVG for marks plus the equivalent HTML table inside a `.chart-summary` details element. The score line is drawn twice along the same path: `.chart-score-casing`, then `.chart-score-line`; markers render above both. Only selected bar rectangles receive the `.chart-mark` ink edge. For a selected line datum, add a separate 10px-diameter `.chart-datum-highlight` circle and an ink label; keep the underlying line stroke unchanged. `.chart-axis`, `.chart-grid`, `.chart-label` and series classes use shared tokens. The `details` element is initially closed, and its summary is a real keyboard-operable control.

### 9.3 Migration mapping: old value or assignment → new value

**Historical source limitation:** the original supplied specification had token names and reported aliases but no existing stylesheet or exact historic hex values. “Not supplied” preserves that original limitation. The repository migration now records actual prior declarations in [the historical token inventory](docs/migration-token-inventory.md). The mapping below targets the current version 1.1 values.

| Existing token | Old value supplied in brief | New literal value |
| --- | --- | --- |
| `--canvas` | Not supplied | `#FAFBFD` |
| `--surface` | Not supplied | `#FFFFFF` |
| `--surface-soft` | Not supplied | `#FCFDFE` |
| `--surface-strong` | Not supplied | `#F3F5F7` |
| `--ink` | Not supplied | `#18212F` |
| `--ink-700` | Not supplied | `#364152` |
| `--ink-500` | Not supplied | `#4F5D70` |
| `--ink-400` | Not supplied | `#59697C` |
| `--ink-300` | Not supplied | `#606E80` |
| `--border` | Not supplied | `#DEE4EB` |
| `--border-soft` | Not supplied | `#EEF1F5` |
| `--border-strong` | Not supplied | `#7F8B9A` |
| `--primary` | Not supplied | `#B84A00` |
| `--primary-hover` | Not supplied | `#963C00` |
| `--primary-soft` | Not supplied | `#FFF2E8` |
| `--spotlight` | Not supplied | `#FFE2CC` |
| `--button-ink` | `var(--primary)` | `#FFFFFF` |
| `--success` | Not supplied | `#216E47` |
| `--success-soft` | Not supplied | `#EAF5EE` |
| `--amber` | Not supplied | `#7A5900` |
| `--amber-soft` | Not supplied | `#FFF4D6` |
| `--rust` | Not supplied | `#B02A46` |
| `--rust-soft` | Not supplied | `#FCECF0` |
| `--violet` | Not supplied | `#7047A3` |
| `--violet-soft` | Not supplied | `#F2EDF9` |
| `--focus-ring` | Not supplied | `#713000` |
| `--radius-control` | Not supplied | `0.5rem` |
| `--radius-card` | Not supplied | `0.75rem` |
| `--font-section-title` | Not supplied | `0.85rem` |

| Reported old expression / treatment | Required replacement |
| --- | --- |
| Navy → OKLCH blue → cobalt accent changes; exact values not supplied | Fixed Ember orange `--primary: #B84A00`, with the specified hover/soft/spotlight values. |
| `--green: var(--primary)` | `--green: #216E47`; migrate semantic usages to `--success`. |
| `--button-ink: var(--primary)` | `--button-ink: #FFFFFF`. |
| Primary token used in series and KPI meters | `--chart-primary: #236C72`; direction uses chart-reduction/chart-increase. |
| Brand-coloured KPI figures | `--ink: #18212F`. |
| Decorative gradient and tinted panel fills | `--surface`, `--surface-soft` or `--canvas` according to structural role. |
| Dark/white-shadow/inset-shadow selection overrides | Shared state selectors in this CSS; remove old overrides completely. |
| Whole-row semantic fill | Neutral row; semantic icon + word in its cell. Brand-soft row fill is reserved for user selection. |
| Page-specific KPI, table and chart variants | One shared class contract, with data and content attributes only. |

### 9.4 Ordered migration

1. **Inventory and root tokens.** Capture current declarations, find every use of the legacy names and remove competing root/page token overrides. Install the literal root block without changing meaning through aliases.
2. **Foundations.** Apply the common font, six-step scale, neutral canvas/surfaces, shared borders and spacing. Remove gradient washes and non-floating shadows.
3. **Focus and actions.** Migrate buttons, links, search, filters and help triggers together. Verify white-on-orange buttons and the neutral gap around the focus ring.
4. **Navigation.** Migrate segmented controls, tabs and sidebar items to the explicit state contract; retain keyboard and URL behaviour.
5. **Status dictionary and shared table.** Separate session State, Attention and Method, fix semantic pills, then migrate Sessions, Analytics and Settings tables together.
6. **One KPI strip.** Replace all tile variants and enforce the nowrap overflow model. Keep every headline value ink-coloured and show meters only for valid scales.
7. **One chart anatomy.** Move series away from the action token, implement paired before/after bars, cased score line, shared labels/axes, and source details inside Summary and data.
8. **Drawers and conversation.** Reuse the header, overlay/focus behaviour and neutral bubbles in the session and driver workspaces.
9. **Screen compositions and retirement.** Assemble each screen from shared classes, delete superseded styles, and perform the release checks in section 7. Record this version as the baseline for future changes.

**Acceptance:** orange identifies actions and location; ink carries headline figures; statuses remain distinguishable without colour; data never inherits the brand hue; and every page shares the same KPI, table and chart contracts.
