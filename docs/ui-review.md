# UI review and current direction

The governing visual specification is [Elevate Autocoach — Design Library v1.1](../Elevate-Autocoach-Design-Library.md). The earlier blue palette and page-specific overview, table, chart, and status styling are retired. Product behavior is preserved through the [local design contract](../DESIGN_SYSTEM.md), [driver portfolio contract](driver-spotlight.md), and [session evidence contract](session-redesign.md).

The original usability problem was competing labels, repeated metadata, and inconsistent interaction patterns. The current system addresses it through one KPI strip per major view, the user’s brighter neutral surfaces and compact type scale, a common table and chart structure, visible essential labels, and optional filters/details. KPI definitions live in accessible info hints; long chart source notes live in Summary and data. Evidence preview and selection remain separate; only Send assigns and shares evidence. Drivers open a portfolio before a session. Analytics and Programs are top-level destinations; Drivers and Groups remain inside Analytics, and program names open quick-review drawers that preserve the source workspace.

Session rows show one State (the attention reason while a person must act, otherwise the lifecycle word), a Coach column instead of Method, and Started, Completed, and Due dates instead of Updated. Ordinary automation and one-on-one methods are neutral; completion, reply, warning, and overdue have their governed word/icon treatments. Headline quantities remain ink, and chart magnitude uses the independent petrol palette.

The application remains a static prototype. Fleet counts, representative driver observations, exposure windows, media availability, and source evidence are fixture data. Do not present sample observations as live telematics or label before/after differences as proven causal improvement. Existing export or integration placeholders are not made functional by styling.

Release evidence and known limitations belong in [design-library migration](design-library-migration.md). Prior screenshots and the standalone session concept remain historical design references only.
