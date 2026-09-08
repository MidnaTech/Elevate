# Session creation and review — 7 September 2026

The user requested that Start Session open the same side-drawer pattern as View Session, with selections revealing the draft progressively. They also requested smaller Events/Video quantities, no Messages count, a taller conversation and a behaviour-specific breakdown.

## Reference review before implementation

Mobbin screens inspected directly, rather than inferred from search labels:

- [Front contact creation](https://mobbin.com/screens/edcf4702-124a-4a9f-aca4-5801fec2e3b0): right-side form, compact optional fields and bottom Cancel/Create actions. Borrow the focused panel and optional-detail disclosure.
- [Acctual contact creation](https://mobbin.com/screens/f2b0a2bb-bebd-4471-8ecd-d904b12585f2): right-side form above the original list, related fields grouped into short sections, bottom action. Borrow source-page continuity and grouping.
- [Midday customer creation](https://mobbin.com/screens/87c2e8dc-7ba5-4cf3-a720-785fcfde884d): a side panel combines full-width identity fields and paired related fields. Borrow horizontal grouping where fields are related.
- [Plain conversation](https://mobbin.com/screens/f3f14996-34dd-4210-aa99-b18a36731f78): conversation occupies the central vertical working area while properties sit in a separate bounded column. Borrow that clear separation and compact context.
- [Zendesk conversation](https://mobbin.com/screens/a5855ce7-b82b-4d19-b206-4842759e7d75): conversation, properties and composer have distinct boundaries. Borrow structural separation; avoid importing its number of simultaneous controls.

These captures establish visible composition, not unseen focus, validation or persistence behavior. Elevate implements those details independently using native dialogs, existing evidence selection and the shared design contract.

## Applied pattern

- One right-side native creation drawer, 1060px maximum; full width on mobile, matching session/profile/group drawers.
- Driver and Programme are available together. Driver and programme entry points prefill only their explicit context; choosing both loads the matching evidence.
- Latest creation contract: only Driver and Programme inputs, with the current manager shown as read-only Coach. No Due, Training lesson or Reason inputs during creation. Matching driver/programme videos select automatically with all camera clips; previews remain collapsed until a row opens; Evidence is a full-width table below Coach. Opening a row shows video and location side by side (stacked on mobile). Add events expands an inline This driver / Unassigned picker with search and multi-selection. Add selected stages the choices; Cancel or Escape discards them without closing the creation drawer. A global Session due period in Programmes → Automation supplies deadlines for new sessions after saving.
- Header and Create/Cancel remain fixed while draft content scrolls. Cancellation does not create a record or change the source page. Creation opens the actual session at the same edge and retains return context.
- Session review uses a compact Events / Videos definition list. Messages remains the conversation content, without a redundant counter.
- Breakdown names the coached programme, e.g. Speeding breakdown. It begins collapsed with a single expansion control. Telematics patterns are Events, not mislabeled Videos.
- Evidence and Conversation have matching heading prominence, neutral rules and separate scrollable content. Reduced summary height gives conversation more room without shrinking media or touch targets.

The local prototype does not establish real playback verification, scoring or notification delivery. See the [full request audit](request-audit-2026-09-07.md) for the remaining operational decisions.

Prior simplification checks passed (before the inline-table update): syntax, 15 static tests, session interactions, driver portfolios, browser/metric regression, programme configuration and the focused global due lifecycle (`test:session-due`). The latter verifies save/reload, invalid values, discard, failed storage rollback and actual new-session inheritance while preserving earlier deadlines. Visual checks covered the simplified form and automatically opened video evidence at desktop, 390px and 320px.

The inline-table update passed syntax, 15 static tests, the session interaction suite and shared numeric sorting checks. Creation coverage includes collapsed previews, camera switching, parent/detail rows remaining together during sorting, driver/unassigned filtering, staged multi-selection, cancellation, deduplication and evidence assignment only on Create. Visual checks at 1440px, 768px, 390px and 320px confirm stacked details, paired desktop media, stacked mobile media and a locally scrollable table on narrow screens. External map requests were blocked during browser QA; live map loading was not revalidated.
