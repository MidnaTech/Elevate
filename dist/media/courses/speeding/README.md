# Heavy-truck speeding course videos

Three finished course videos for the speeding programme, narrated by Emily, 16:9, delivered September 8, 2026 as `Desktop/videos`.

| Level | Course | Runtime | Files |
| --- | --- | --- | --- |
| 1 | Reset your speed | 60 s | `speeding-level-1.mp4`, `.jpg` poster, `.vtt` captions |
| 2 | Understand the consequences | 90 s | `speeding-level-2.mp4`, `.jpg`, `.vtt` |
| 3 | Make the safer decision | 120 s | `speeding-level-3.mp4`, `.jpg`, `.vtt` |

- The MP4s are the delivered captioned masters (2560x1440, H.264/AAC, captions burned in). No re-encode was applied.
- Posters are the delivered covers downscaled from 5504x3072 to 1280 px wide JPEG.
- Captions are the delivered SRT files converted to WebVTT; timings are unchanged.
- `manifest.json` keeps the CloudFront links to the clean (caption-free) masters, full-resolution covers and production receipts for future editing.
- Not included: the per-level narration/storyboard JSON and assembly reports (production artefacts), and the unrelated `VideosFleetSense/Effieincy Recording.mov` screen recording.

Referenced from `dist/speeding-course-pack.js` (`levels[].media`) and surfaced in the Training library course preview, Programmes › Learning, and the Driver app lesson player.
