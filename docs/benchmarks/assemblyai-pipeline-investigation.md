> Later audit: synthetic WAV conversion retained 22.05 kHz while the benchmark declared 16 kHz. These are slowed-speech measurements, not a valid real-tempo comparison. See the corrected investigation report.

# Cluegent STT local optimization investigation — 2026-10-09

No deployment, production routing, production packet-size change, key change, or production model change was made. A separate Electron lab reused the native capture wrappers and RollingTranscript component. It does not include the full NativelyInterface tree; previous app UI measurements remain separately documented.

## Measured native capture → first partial paint opportunity

| Channel | p50 / p95 / max (ms) | Speech trials / total |
|---|---|---|
| mic | 962 / 1139 / 1159 (n=2) | 2/4 |
| system | 967 / 982 / 983 (n=3) | 3/4 |

These are captured-audio onset estimates, not externally measured mouth-to-physical-screen latency. The onset uses the first PCM sample above amplitude 300, with callback time minus frame duration as its origin. Hardware buffers and native queue age are not calibrated. Two requestAnimationFrame callbacks mark a paint opportunity. Native sample counts are too small to characterize production tails; p95 is descriptive interpolation only. EarPods prevented test playback reaching the mic; two human-speech trials supplied mic measurements, and silent trials are excluded.

## Controlled PCM → first displayed partial

| Model | p50 / p95 / max (ms), six runs | First correct opening word, p50 / p95 / max (ms) |
|---|---|---|
| universal-3-6-pro | 407 / 429 / 430 (n=6) | 1638 / 1660 / 1665 (n=6) |
| universal-3-5-pro | 411 / 573 / 624 (n=6) | 411 / 573 / 624 (n=6) |
| universal-streaming-english | 1127 / 1209 / 1232 (n=6) | 1127 / 1209 / 1232 (n=6) |

Each model used 50/60/100 ms packets on the same continuous clip and a version with 1.5 seconds of silence inserted at its midpoint. Each cell has one run: this is a controlled screening experiment, not repeated independent accuracy evaluation. The injected sample clock is anchored before real-time packet pacing and includes packet collection. Initial partial text can be wrong; first-correct-opening-word measures the first partial starting with the known word “We”, not the first fully correct utterance.

## Partial update cadence

| Model | Continuous p50 / p95 / max (ms) | Pause-inserted p50 / p95 / max (ms) |
|---|---|---|
| universal-3-6-pro | 1222 / 1325 / 1395 (n=34) | 1233 / 1328 / 1360 (n=36) |
| universal-3-5-pro | 1220 / 1291 / 1320 (n=25) | 1235 / 1336 / 1359 (n=27) |
| universal-streaming-english | 343 / 1145 / 1391 (n=96) | 339 / 902 / 1181 (n=90) |

Only text-changing non-final updates within the same turn are compared; repeated identical partials are excluded as in the application. Identical-text renderer samples are also excluded because React can skip a text-state render and their diagnostic metadata waits for a subsequent change. Hesitation/silence can remain in these intervals. Continuous speech did not make Pro updates approach a word-by-word cadence.

## Packet-size screening

| Model / style | 50 ms first partial → paint | 60 ms | 100 ms |
|---|---:|---:|---:|
| universal-3-6-pro / continuous | 401 | 424 | 398 |
| universal-3-6-pro / paused | 409 | 430 | 405 |
| universal-3-5-pro / continuous | 408 | 413 | 389 |
| universal-3-5-pro / paused | 409 | 420 | 624 |
| universal-streaming-english / continuous | 1099 | 1139 | 1108 |
| universal-streaming-english / paused | 1135 | 1119 | 1232 |

50–1000 ms binary PCM frames are documented by AssemblyAI. All 18 connections confirmed the requested exact model and accepted these tested sizes. Packet differences did not consistently improve first partial or Pro update cadence; retain 60 ms pending replicated trials.

## Native suppression and missing system transcript

Native code emits 20 ms frames immediately during active speech, hangs over after speech (system 600 ms, mic 500 ms), and emits 20 ms silence keepalives approximately every 100 ms during suppression. Packing three sparse keepalives can produce ~200–300 ms queue waits during silence. This is distinct from active-speech buffering. Gating compresses the submitted audio timeline, so provider timestamps cannot be treated as wall-clock timestamps without a per-frame mapping.

mic: active-adjacent 60 ms packet send intervals p50/p95/max 60 / 69 / 244 (n=201) ms. Provider-event-to-paint opportunity 27 / 34 / 34 (n=10) ms.

system: active-adjacent 60 ms packet send intervals p50/p95/max 129 / 141 / 145 (n=236) ms. Provider-event-to-paint opportunity 29 / 33 / 34 (n=18) ms.

One system trial had non-zero PCM but no transcript; three repeats produced incomplete transcripts despite confirmed 3.6 connections. The same clean PCM injected into the socket had zero final errors. The tap used EarPods/CoreAudio, 48 kHz mono; mic used 44.1 kHz. The observed delivery cadence and transcription loss point to capture/format/timeline validation as a priority. They do not prove a specific CoreAudio implementation bug. Playback quality, device routing and the native ASBD/buffer layout must be checked before a fix. Human speech and synthetic playback can overlap during later trials, so native WER is not a valid model comparison.

## Accuracy and recommendations

universal-3-6-pro: continuous 0/105 final word errors; pause-inserted 0/105.

universal-3-5-pro: continuous 0/105 final word errors; pause-inserted 3/105.

universal-streaming-english: continuous 0/105 final word errors; pause-inserted 6/105.

The artificial pause may cut a word, so the second condition tests interruption robustness rather than normal meeting accuracy. These results do not establish accent/noise performance.

1. Keep current production settings while debugging system capture. Validate raw PCM with a saved known-clip capture, actual native callback timestamps, per-buffer channel count/stride/rate, and separate built-in-output versus EarPods tests. Test a diagnostic suppression bypass; no bypass was implemented in production.
2. Keep 60 ms packets for now. Lowering to 50 ms cannot remove the observed ~1.2 second Pro cadence. Avoid sub-50 ms frames.
3. For an English caption-focused mode, Universal-Streaming merits a real-meeting A/B test: faster subsequent updates but slower first partial and worse pause-inserted final accuracy here. Keep 3.6 as the accuracy-oriented default; 3.5 showed no cadence advantage.
4. For an exact per-word speech-to-screen distribution, synchronize native hardware sample timestamps, independently align a reference recording, track the first correct appearance of each word, and externally calibrate physical display timing if that is required. Current estimates do not meet that exact standard.
5. Repeat at least tens of utterances per channel/device and randomize model/packet order before using p95 for release decisions. Native mic n=2 and system n=3 are preliminary.

Sources: [AssemblyAI streaming protocol](https://www.assemblyai.com/docs/coding-agent-prompts), [SDK parameter reference](https://assemblyai.github.io/assemblyai-node-sdk/types/StreamingTranscriberParams.html).
