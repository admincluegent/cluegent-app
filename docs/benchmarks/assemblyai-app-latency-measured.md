# Actual AssemblyAI app latency session — 2026-10-09

Captured 80 provider transcript events, 80 UI samples, 140 audio windows across microphone and system audio. The microphone produced speech transcripts; the other stream produced no transcript, so system-audio speech latency was not tested. Provider confirmed/requested model: universal-3-6-pro.

## Microphone partial updates (valid UI samples)

| Stage | p50 / p95 / max (ms) |
|---|---|
| Main dispatch | 1.0 / 1.0 / 3.0 |
| IPC to renderer | 0.0 / 1.0 / 1.0 |
| Receive to React commit | 4.9 / 6.2 / 6.7 |
| Commit to paint opportunity | 22.2 / 30.2 / 32.5 |
| Provider event arrival to paint opportunity | 27.5 / 34.7 / 38.3 |

Based on 64 non-final events. Six slow final-event samples were instrumentation artifacts: final text unchanged, layout hook only reran when text changed. Their 666–4,838 ms values do not establish UI delay. The hook now measures every commit. All final samples are excluded from this table conservatively.

## Audio packet path

Native PCM chunks: microphone 1,760 bytes (~19.95 ms at 44.1 kHz mono PCM16); system audio 1,920 bytes (20 ms at 48 kHz). WebSocket target packets: 5,292 / 5,760 bytes respectively, both 60 ms.

Speech-like microphone windows: 47, selected by callback interval median below 50 ms, excluding startup queue spikes above 1 second. This is a cadence heuristic, not independently labeled speech.

| Stage | Window-median p50 / p95 / max (ms) |
|---|---|
| Capture callback interval | 23.8 / 25.0 / 25.1 |
| Oldest sample queue wait | 60.0 / 61.6 / 62.5 |
| Local socket write completion | 0.3 / 0.3 / 0.4 |

Across all windows, queue-wait window median was ~213 ms. Much of that includes silence: native suppression emits 20 ms keepalive frames roughly every 100 ms; collecting a 60 ms packet can then take ~200–300 ms. Do not describe this as continuous-speech capture latency. Startup queue waits reached 2,557 ms. One local socket callback reached 511 ms; ordinary window medians were ~0.3 ms. A local send callback is not provider receipt acknowledgment.

Consecutive non-final provider updates (excluding a preceding final): 48 intervals, p50 / p95 / max = 1202.2 / 2394.2 / 4383.4 ms. This can still include hesitation/silence; it measures update cadence, not spoken-word recognition latency.

## Conclusion

For measured partials, the application adds tens of milliseconds after a provider event arrives. IPC is small. Most visible batching is already present in provider update cadence, with additional tens of milliseconds of speech packet collection. This is an inference from timing, not a separation of network and inference compute. Native silence suppression explains the much larger all-window capture/queue medians. System-audio speech remains unmeasured. No independent speech-onset timestamp exists, so exact mouth-to-screen latency cannot be calculated. Two rAF callbacks indicate a paint opportunity, not physical display output. Cross-process spans use wall clock; renderer spans use monotonic timing.
