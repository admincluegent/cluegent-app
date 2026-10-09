# Isolated system audio capture fix — 2026-10-09

Production source, installed addon, STT routing and backend were not modified. Five protected file hashes match the preceding investigation. The candidate compiled into a separate `/tmp` Cargo target and was loaded only by a standalone Electron test process. Default output was restored to EarPods.

## Confirmed causes

The tap advertises 48,000 Hz, mono Float32, flags 9 (float + packed). Every observed buffer contains 2,048 bytes = 512 mono float samples. Treating channel count 1 as stereo discards half the sample frames. Independently, EarPods callbacks advance 512 sample frames every ~11.610 ms, confirming a 44,100 Hz capture clock despite the 48,000 Hz ASBD. Built-in speaker callbacks advance 512 frames every ~10.667 ms, confirming 48,000 Hz. Mach host ticks were converted using the OS timebase, not assumed to be nanoseconds.

## Candidate changes and validation

- Use the actual output device rate, falling back to nominal rate; log the advertised ASBD separately. This is a tested initial clock candidate, not a universally safe replacement for ASBD on all devices.
- Decode actual buffer channel count: mono is copied intact; interleaved multichannel input is averaged per complete frame. Remove the forced-stereo fallback and AVAudioPcmBuf reinterpretation.
- Validate 32-bit float, little-endian format, exactly one buffer, positive channel count, byte/frame divisibility, pointer alignment, non-null storage and finite samples. Unsupported multibuffer layouts are rejected by this prototype.
- Compute system DSP frames with rounded rate × 0.020: 882 samples at 44.1 kHz, 960 at 48 kHz. The old integer expression produced 880 at 44.1 kHz.
- Assemble packets from actual PCM samples: 2,646 samples / 5,292 bytes at 44.1 kHz; 2,880 samples / 5,760 bytes at 48 kHz. Send as soon as a complete 60 ms packet exists; add no animation, batching delay or extra pacing timer.
- Validate host/sample timestamp flags, monotonicity, 512-frame increments and cumulative frame/host-time rate offline. All four trials passed; each capture session is analyzed separately. Startup sample timestamps may be negative; relative increments are what matter.

## Measurements

Four real-device playback trials: independently generated 750 Hz tone plus a spoken reference, normal suppression and diagnostic bypass. The same signal was played through EarPods and built-in speakers. These are capture-to-local-packet measurements, **not actual WebSocket transmission, provider latency or speech-to-screen latency**. Each configuration has one run; statistics describe callbacks/packets within that run.

| Device / suppression | Timestamp rate Hz | Tone Hz | Active packet interval p50 / p95 / max ms | n |
|---|---:|---:|---:|---:|
| EarPods / normal | 44100.12 | 749.95 | 60.27 / 69.03 / 72.52 | 68 |
| EarPods / bypassed | 44100.18 | 750.09 | 60.08 / 71.34 / 75.42 | 66 |
| MacBook Air Speakers / normal | 48000.29 | 750.00 | 61.59 / 67.46 / 68.70 | 67 |
| MacBook Air Speakers / bypassed | 48000.28 | 750.00 | 61.39 / 67.75 / 68.27 | 67 |

Active intervals include adjacent packets whose RMS exceeds 100 PCM16 units. This threshold is an analysis filter, not a replacement VAD. Normal suppression creates silence gaps: maximum overall interval 359.65 ms on EarPods and 353.25 ms on built-in speakers. Bypassed maximum overall interval was 75.42 / 69.10 ms. Native callback p95 was 11.6103 / 10.6667 ms respectively. Polling, scheduling and callback delivery account for remaining packet jitter; a 60 ms audio packet is not a guarantee of an exactly 60 ms wall-clock interval.

Earlier unchanged-production tone measurements were ~1,632.68 Hz on EarPods and 1,500 Hz on speakers for the same 750 Hz source. This candidate restores ~750 Hz on both; sample-time and host-time rates agree within 0.3 Hz. All observed packet byte counts matched the 60 ms target.

## Proposed production work — not applied

The attached patch is an experimental candidate for review, not a deployment-ready universal CoreAudio fix. Before production: validate the source clock over a short timestamp window **before DSP/STT initialization**, selecting among tap ASBD, physical-device rates and the observed frame clock. Do not blindly trust the physical device rate on Bluetooth/HFP or after a device switch. On a confirmed clock change or timestamp discontinuity, restart DSP and STT coherently rather than changing only a shared rate while DSP continues with its cached rate.

Support planar/multiple buffers explicitly, or return a visible capture error and fallback instead of silently skipping unsupported layouts. Add counters for rejected buffers and ring-buffer overflow; remove per-callback logging from the realtime thread. Confirm stereo, Bluetooth/HFP, device switching, sleep/wake and extended capture. Retain suppression for the initial rollout: removing it solely to enforce wall-clock packet cadence changes capture behavior.

This run did not repeat recognition/WER or microphone benchmarks; restoring PCM pitch and clock correctness is not itself an accuracy benchmark. Next run the existing AssemblyAI path with the validated format, sample rate and packet sizes to verify recognition and true speech-to-screen timings.

## Artifacts

- `experimental-capture.patch`: proposed system capture source diff; not applied.
- `candidate-analysis.json`: timestamp, waveform and packet statistics.
- `candidate-capture-results.json`: raw local callback and packet timestamps.
- `production-integrity.json`: unchanged protected source/addon hashes.
- Scripts preserve the lab execution used here. They refer to the `/tmp/cluegent-stt-native-investigation` fixture directory and require its original fixture/device utility; they are session reproductions, not a standalone installer. Raw WAVs and native logs remain there.
