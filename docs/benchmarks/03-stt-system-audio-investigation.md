# Report 3 — System audio investigation

## Isolated test design

A separate addon was compiled from a temporary source copy. It exposes diagnostic environment switches for the existing channel policy versus reported channels, and normal suppression versus bypass. The installed `.node` file was not replaced. The current production addon was also tested as a control. Both built-in speakers and EarPods were exercised, and the original output device was restored.

The corrected reference is 48 kHz mono PCM16: silence, an independently generated 750 Hz tone, silence, explicitly resampled spoken reference, trailing silence. Native output PCM was written to WAV with callback-size/time logs. Tone frequency was measured from interpolated positive zero crossings. Sample counts and callback timing were recorded. Total recorded duration includes capture tails and suppression differences, so it is not itself a word-completeness score.

| Device | Variant | Declared Hz | Tone Hz | Native frame-gap median ms | Delivered PCM ms |
|---|---|---:|---:|---:|---:|
| EarPods | production | 48000 | 1632.68 | 46.0 | 2540 |
| EarPods | reported | 48000 | 816.35 | 24.2 | 4860 |
| EarPods | reported-bypass | 48000 | 816.33 | 24.0 | 5720 |
| EarPods | original-bypass | 48000 | 1632.67 | 43.7 | 3080 |
| MacBook Air Speakers | production | 48000 | 1500.00 | 42.6 | 2740 |
| MacBook Air Speakers | reported | 48000 | 750.00 | 18.9 | 5140 |
| MacBook Air Speakers | reported-bypass | 48000 | 750.00 | 18.8 | 6200 |
| MacBook Air Speakers | original-bypass | 48000 | 1500.00 | 42.5 | 3100 |

`reported` is the channel-only diagnostic change with normal suppression. `reported-bypass` additionally bypasses suppression. `original-bypass` keeps the incorrect channel behavior while bypassing suppression. Tone pitch and active frame delivery improve with the channel change; bypass alone does not fix pitch or pacing. This separates the primary channel defect from gating. The native trace reports one channel in both ASBD and AudioBufferList, yet the current fallback passes 2 to `push_audio()`, averaging adjacent mono samples and reducing the frame count by half.

EarPods nominal device rate is 44.1 kHz; built-in speakers are 48 kHz. The tap reports 48 kHz for both. After fixing channel interpretation diagnostically, EarPods' tone is 816.33 Hz: 750×48000/44100. Using 44.1 kHz when replaying those samples restores the reference clock, but this is not a universal production fix: actual callback/hardware clocks must be validated dynamically, especially for Bluetooth/HFP and device changes.

## PCM speech completeness through the same STT model

Recorded speech was isolated after the tone using its measured time-scale ratio, then correctly resampled to 16 kHz and replayed at real-time speed through `universal-3-6-pro`. The original declaration was preserved in baseline replays to reproduce the observed distortion. This is a short 9-word reference, not a general accuracy score or a live physical speech-to-screen test.

| Recorded input / replay clock | Errors / 9 reference words | WER |
|---|---:|---:|
| capture-92-production-clock48000 | 16 / 9 | 177.8% |
| capture-92-reported-bypass-clock48000 | 0 / 9 | 0.0% |
| capture-92-reported-bypass-clock44100 | 0 / 9 | 0.0% |
| capture-74-production-clock48000 | 1 / 9 | 11.1% |
| capture-74-reported-bypass-clock48000 | 0 / 9 | 0.0% |
| capture-92-reported | 0 / 9 | 0.0% |
| capture-92-original-bypass | 6 / 9 | 66.7% |
| capture-74-reported | 0 / 9 | 0.0% |
| capture-74-original-bypass | 1 / 9 | 11.1% |

Both reported-channel captures with normal suppression produced zero errors on this short reference. Bypassing suppression while keeping the current channel interpretation still produced errors. Suppression is therefore not the primary cause of the tested pitch/pacing fault. The EarPods clock mismatch remains audible in the tone even when this short speech clip happens to transcribe correctly.

## Recommended code-level changes — not applied

1. Replace the hard-coded stereo fallback in both CoreAudio decode branches with validated buffer/ASBD channel handling. Treat mono as mono. Handle interleaved and planar buffers explicitly; do not assume that `data_f32_at(0)` is a complete interleaved multi-channel buffer. Validate byte count, sample width and stride before conversion.
2. Validate actual callback sample clock against host/sample timestamps and the active device's nominal rate. The present unconditional ASBD-rate publication disagrees with this EarPods test. Resample from a validated source clock to 16 kHz mono, or publish the truthful native rate to DSP and WebSocket together. Do not hard-code 44.1 kHz or blindly replace every tap rate with the physical device rate; that could break other tap/HFP layouts.
3. Compute native frame length from the full rate rather than integer `rate/1000` truncation. At 44.1 kHz the current expression makes 880 rather than 882 samples per nominal 20 ms frame. This is a small secondary packet-alignment issue, not the main twofold slowdown.
4. Add produced/consumed/dropped sample counters, ring occupancy, native host timestamps and per-frame source timestamps. The current ignored ring push failures make loss unobservable; this test does not prove overflow.
5. Retain suppression while testing a timestamp-preserving silence strategy. It emits sparse 20 ms keepalives approximately every 100 ms; collecting 60 ms of those takes roughly 200–300 ms during silence. Speech is sent immediately when detected, with 600 ms system hangover and 500 ms mic hangover. DSP polling is 5 ms. Keep silence behavior separate from active-speech clock faults.
6. Validate initialization and route changes with a known PCM health test. A successful socket and a started tap do not prove valid speech PCM. SCK currently handles initialization failure; it does not automatically detect a successful but misformatted tap.

Remaining coverage: multi-channel/planar devices, Bluetooth HFP, device removal, sample-rate changes during meetings, long-running overflow/stress tests, and Windows loopback. The channel-only diagnostic patch is causal evidence, not a production-ready cross-device decoder.

Sources and reproducibility: [valid model events and derived metrics](assemblyai-investigation-valid-results.json), [corrected native capture measurements](coreaudio-isolated-capture-corrected.json), [capture replay](assemblyai-capture-replay-corrected.json), [factorial replay](assemblyai-capture-factorial.json), [diagnostic-only patch](coreaudio-diagnostic-only.patch). Native WAVs and the separately compiled addon are in `/tmp/cluegent-stt-native-investigation`; those files are not bundled into the app. The output device was restored to EarPods after the tests. Existing application/native sources and the installed addon were preserved in this investigation. No routing, credentials or deployment changed. Earlier diagnostics already present in the working tree were retained.
