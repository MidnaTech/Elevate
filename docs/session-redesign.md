# Session workspace

The session drawer is an evidence review and conversation workspace in the application served from `dist/`. It uses the shared record drawer width: 1060px maximum, capped to the available viewport, and full width on mobile. The earlier [interactive concept](session-redesign.html) remains a design reference with separate sample data.

## Layout

Evidence sits on the left and the conversation on the right. The manager can review an incident while composing a response.

| Area | Content and behavior |
| --- | --- |
| Header | The program as the title, one context line (Coaching session · driver · opened by coach, date), one operational status with its due time, the available lifecycle action, and Close. A session opened from a portfolio retains its return path. |
| Evidence | **Why this session was created** leads the pane. A program card shows the linked event count and cycle with a collapsible event-type breakdown (count, type, rule, source). **Videos** lists one row per event: duration chip, timestamp, type, and source. Choosing a row opens an inline viewer with the incident map on the left and the footage on the right; choosing it again closes it. A camera selector appears only when the event has multiple clips. |
| Conversation | Human messages and private notes with authors and times. Shared evidence opens in the same viewer. |
| Composer | Reply / Private note mode, a compact input, one selection count, and Send or Save note. The selection count opens the same event browser as Add events. |
| Earlier activity | One collapsed log for assignment, acceptance, reminders, and lifecycle facts. Duplicate system messages are removed from this view. |
| Shared evidence | Each message with evidence carries a collapsed **n videos attached** disclosure whose entries reopen the same viewer. |

Event type, time, duration, and source stay on the video row; location stays with the map; camera controls stay with the video. Severity and vehicle appear in one quiet row below the open viewer. There is no permanent metadata rail, duplicate attachment strip, or second history timeline.

## Events, clips, and sharing

An event is the incident or recorded pattern being coached. An event can own multiple camera clips. The event's links to sessions and its selection for a particular reply are separate states.

1. **Open a session.** Show its linked events and preview the first event. The first draft selects linked evidence that has not already been recorded as shared in the session's messages.
2. **Preview.** Selecting an event or camera changes the viewer without selecting, assigning, or sending evidence.
3. **Add events.** Open a browser with **This driver** and **Unassigned** scopes and search by event, date, location, vehicle, source, or program. Results group clips under their event.
4. **Select.** A checkbox selects the entire event, including all its associated clips. **Use selection** stages the choices in the reply. **Cancel**, Close, backdrop dismissal, or Escape discards changes made inside the browser.
5. **Send.** Send the selected events with the reply. Evidence can be sent without message text. This is the point at which a selected unassigned event becomes associated with the driver and linked to the session. Its original event type, category, source, timestamp, vehicle, and location remain unchanged.

After Send, the reply's selection clears. Previously shared events remain available from the message and linked event selectors; closing and reopening the drawer does not silently select them again. Removing an event from the reply selection does not delete it or its media.

Reply text, private-note text, cursor positions, the active event/camera, and unsent selections belong to each session. Browsing events, toggling the viewer or breakdown, or returning through the driver portfolio preserves the draft. These states last for the current page session; the prototype does not persist them to a backend or across a page reload.

Private note mode hides sharing controls, preserves the separate reply selection, and saves only a team-visible note. It does not assign unassigned events or share the reply's attachments.

## Record states and responsive behavior

Completed and archived sessions retain evidence, conversation, and Earlier activity. They have no composer or Add events action. Completed records can be archived. Restore returns an archived record to Completed; it does not resume active coaching.

A blocked delivery retains the account-link problem and **Relink driver** action. Relinking queues the existing automated retry flow. Both blocked and retry-queued sessions remain guarded against replies and evidence assignment while coaching delivery is unresolved.

On narrower screens, the evidence workspace stacks above the conversation while keeping video and map together where space permits. The event browser's list and preview also stack. Scrolling stays inside the drawer or dialog; the surrounding page must not gain horizontal overflow. Native dialogs contain focus, support Escape and backdrop dismissal, and return focus to the opening control.

## Data contract

`dist/session-evidence.js` owns the event registry. `dist/session-workspace.js` owns per-session draft state and interaction updates. `dist/session-workspace.css` arranges the workspace without overriding the shared drawer width.

- Stable event IDs connect incidents to their camera clips and to any sessions in which they are shared. Existing clip IDs remain usable by message references.
- Read and preview operations do not assign records. `linkEvidenceEvents(session, eventIds)` commits associations after Send, prevents cross-driver sharing, and rejects closed-session changes.
- Original source metadata is retained separately from mutable driver/session associations. Sharing an event into a different coaching program does not rewrite the event's original category.
- A duration expressed in days, trips, or an event count is a pattern, not a video. Pattern evidence has a data view and no fabricated clip duration or incident pin.
- Evidence comes from recorded fixture items. No extra clips, severity values, vehicles, or locations are generated from session hashes or coaching status.
- Missing media URLs use explicitly labeled **Illustrative footage**. Supplied media URLs use native video playback, with a thumbnail when available.
- Valid recorded coordinates use a Leaflet incident map with OpenStreetMap tiles, the coordinates, and an Open in Google Maps link; Leaflet loads on demand from cdnjs and falls back to an OpenStreetMap embed. Rowan Hall's two linked events carry fixture coordinates in Mississauga so the viewer can be demonstrated. Without coordinates, the view states that location or coordinates are unavailable and shows a labeled illustration without an incident pin. Recorded location text remains visible when present. A route must not be inferred without route data.
- The unassigned phone-handling fixture explicitly contains Road and Cab clips for the same event to demonstrate grouped selection. Its media remains illustrative and its coordinates unavailable.

The prototype fixtures have no connected media service or verified incident GPS feed. The viewer supports those fields when supplied; the illustrations do not imply a live integration.

## Validation

With the local application running and Playwright and Chrome available, run:

```bash
npm run check
npm test
npm run test:sessions
```

The session suite covers draft preservation, preview versus selection, Cancel and Escape, grouped camera clips, assignment only on Send, original source metadata, private-note isolation, pattern evidence, missing media/location, closed records, delivery guards, focus, and responsive layouts. Run the shared browser and driver checks when a change also affects navigation or record drawer behavior; see [README](../README.md).

## References

The arrangement draws on [Frame.io's video and comments workspace](https://mobbin.com/screens/39416f38-9246-4a6d-bc30-79874a268b5e) and [Intercom's conversation workspace](https://mobbin.com/screens/d4d6efaf-d387-4211-9bdf-1c207d1f2714). [Motive's safety event workflow](https://helpcenter.gomotive.com/hc/en-us/articles/6189410468509-Safety-Events-on-the-Fleet-Dashboard) supplies domain context for incident review. Elevate's event selection and reply rules are defined above.
