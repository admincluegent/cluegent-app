# AssemblyAI app pipeline profiling

Instrumentation added 2026-10-09. Live app measurements are pending a listening session. No bottleneck is claimed yet.

## Verified configuration

Audio goes from native capture to Electron `FirebaseManagedSTT.write()`, into PCM packet buffering, directly to AssemblyAI WebSocket, then through main-process transcript handling/IPC into React. Firebase authorizes model/tokens and tracks usage; it does not relay audio.

At 16 kHz mono PCM16 the 60 ms target packet is 1,920 bytes. This is a configuration value, not a measured capture delay. Native capture may supply larger chunks; capture duration and callback intervals are logged to detect this. Pro uses `interruption_delay=0`, `mode=min_latency`, and continuous partials.

## Collect a run

Run `CLUEGENT_STT_TIMING=1 npm run electron:dev` with the renderer on port 5180. Enable listening and speak/play representative meeting audio for 30–60 seconds. Stop listening to flush the final audio summary. Separate microphone and system-audio trials make comparisons easier.

Logs are tagged `[SttTiming]` in `~/Documents/natively_debug.log` (10 MB rotation). They contain event IDs, channel, timing distributions and sizes; instrumentation does not log audio, words, keys or tokens. Profiling is enabled by default in development launches. Production requires CLUEGENT_STT_TIMING=1; CLUEGENT_STT_TIMING=0 disables profiling in either environment. Every audio packet is measured in memory; summaries are written roughly once per two seconds to limit overhead.

Generate a report:

```sh
node scripts/report-stt-latency.cjs ~/Documents/natively_debug.log docs/benchmarks/assemblyai-app-latency-measured.md
```

Use a run-specific excerpt if comparing sessions. One stream UUID can span reconnects; `sinceFirstSendMs` is elapsed from the first send since stop/reset, not speech onset or an isolated provider latency measurement.

## What each measurement means

| Measurement | Meaning |
|---|---|
| captureBytes / captureAudioMs | Size/duration of each PCM chunk entering STT |
| captureGapMs | Interval between native-to-STT callbacks |
| packetBytes / packetAudioMs | Size/duration submitted to WebSocket |
| queueWaitMs | Oldest captured sample's wait until packet submission; includes startup buffering |
| localSocketWriteMs | Send callback minus submission; local write only |
| updateGapMs | Interval between distinct nonempty transcript emissions, including silence/turn boundaries |
| mainDispatchMs | Transcript arrival/parse through application handling before IPC dispatch |
| ipcMs | Main dispatch to renderer receipt; cross-process wall clock |
| commitMs | Renderer receipt to transcript React layout effect; monotonic clock |
| paintOpportunityMs | Commit to double requestAnimationFrame; an opportunity to paint |
| providerToPaintMs | Provider event arrival to UI paint opportunity |

Audio summaries include count/p50/p95/max. Generated audio report rows describe the distribution of window medians, not pooled packet percentiles. Inspect each raw summary's p95/max for spikes. UI reports are correlated with provider events by streamId/eventId. React can batch multiple transcript updates into one commit; coalescedEvents shows this. Hidden UI is not measured; pending event metadata is capped at 64. A paint opportunity does not establish that an individual superseded partial was physically displayed.

These logs begin after native capture reaches JS. They do not separate the native device buffer, network transport and provider inference. `sinceLastSendMs` cannot represent inference latency because audio is continuously sent. First spoken-word latency requires an independent speech-onset/reference timestamp.

## Existing independent API benchmark

The earlier synthetic real-time test measured Pro 3.6 first partial median about 461 ms after estimated speech onset and partial update median about 1,218 ms. It excluded this app's native capture and UI, so those values are context only, not results of this profiling run. See `assemblyai-streaming-2026-10-09.md`.
