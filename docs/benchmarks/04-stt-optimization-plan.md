# Report 4 — Prioritized optimization plan

No implementation approval has been assumed. The proposed production changes are listed in reviewable scope below. Expected benefits are tied to observed mechanisms; no unmeasured latency savings are promised.

| Priority | Proposed work | Expected benefit | Complexity | Risk and release gate |
|---|---|---|---|---|
| P0 | Correct mono/interleaved/planar CoreAudio decoding | Restore sample count and remove measured 2× pitch/time distortion | Medium | Validate buffer layouts on built-in, EarPods, stereo and SCK; do not copy the diagnostic switch directly |
| P0 | Validate source clock; truthful rate or explicit 16 kHz resampling | Remove tested EarPods 48/44.1 mismatch; restore correct packet-time interpretation | Medium–high | HFP and route changes can differ from physical-device rates; validate host/sample clocks before choosing a clock |
| P1 | Add raw-frame timing, drop counters and queue occupancy | Separate hardware/native wait from packet/network/provider timing; make missing PCM observable | Medium | Bounded logs, no transcript/audio/keys in normal logs; recording opt-in and local |
| P1 | Resolve startup token/sample-rate sequencing | Reduce observed multi-second startup buffering and avoid an avoidable rate-change reconnect | Medium | Tokens are short-lived and single-use; preserve first speech and quota checks |
| P1 | Preserve source timestamps through gating and packet splits | Reliable speech-to-screen estimates and accurate word-time mapping | Medium | Sparse silence compresses provider audio time; preserve a mapping or stream a faithful time base |
| P2 | Keep immediate provisional rendering and replace revised turns | Maintain current tens-of-ms display overhead | Low | No fabricated word typing or delay; skip unchanged duplicate partials |
| P2 | Retain 60 ms packets while repeating randomized 50/60/100 ms trials | Avoid overfitting a small packet test | Low | Corrected continuous 50/60/100 ms recheck showed no consistent benefit; one run/cell cannot characterize tails |
| P2 | A/B accuracy and caption-cadence modes after capture repair | Let users choose frequency versus recognition tradeoffs if real interviews support it | Medium | No routing/model change until representative accuracy, terms, accents, noise and cost gates pass |

The source sends queued packets as soon as the socket opens. A long startup backlog can be replayed in a burst; the official protocol requires real-time pacing. We did not observe a measured server rate-rejection attributable to this, so it is a risk to test, not a proven cause of current failures. Prefetch authorization during setup where safe, stabilize capture format before opening the stream, and define bounded backlog handling without losing the start of an utterance.

## Acceptance tests before a build

- Independently generated reference tone and a correctly resampled speech recording preserve rate, pitch, channels and sample count across every supported route.
- Active packet timing reflects the declared source clock, with measured queue tails and drop counts. Silence suppression is evaluated separately.
- Repeat the same human interview samples on all models with randomized ordering, more speakers and accents, technical terms, actual background voices and realistic meeting capture.
- Measure word appearance using independent reference alignment and native hardware timestamps. Report missing/corrected words, latency distributions and sample counts. Calibrate physical display timing externally if required.
- Test startup, reconnect, stop/restart, source toggles, device changes, permissions and full packaged-app flows. Preserve existing backend routing/usage behavior.
- Verify the native addon was rebuilt and packaged; a TypeScript-only build cannot deploy a CoreAudio fix.

The approval scope I recommend first is a local capture-format/clock fix plus diagnostics and device regression tests, with no deployment and no model/routing/credential change.

Sources and reproducibility: [valid model events and derived metrics](assemblyai-investigation-valid-results.json), [corrected native capture measurements](coreaudio-isolated-capture-corrected.json), [capture replay](assemblyai-capture-replay-corrected.json), [factorial replay](assemblyai-capture-factorial.json), [diagnostic-only patch](coreaudio-diagnostic-only.patch). Native WAVs and the separately compiled addon are in `/tmp/cluegent-stt-native-investigation`; those files are not bundled into the app. The output device was restored to EarPods after the tests. Existing application/native sources and the installed addon were preserved in this investigation. No routing, credentials or deployment changed. Earlier diagnostics already present in the working tree were retained.
