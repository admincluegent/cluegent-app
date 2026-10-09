# Report 1 — Root cause analysis

The main actionable fault is the macOS CoreAudio tap's mono handling. Provider update cadence explains much of the visible batching; the UI is comparatively fast. There is also a separate EarPods clock mismatch. This report distinguishes direct measurements, causal diagnostic changes and remaining uncertainty.

## Verified pipeline

System audio → CoreAudio global process tap (SCK fallback on initialization failure) → floating-point PCM ring buffer → native 20 ms framing/PCM16 conversion → system RMS suppression → native JS callback → SystemAudioCapture data event → FirebaseManagedSTT.write → PCM packet queue → 60 ms binary WebSocket frames → AssemblyAI Turn event → main transcript handling → native-audio-transcript IPC → NativelyInterface state → RollingTranscript layout commit → paint opportunity. Microphone audio instead comes through a disposable utility process and includes WebRTC VAD.

Firebase supplies authorization, route/model selection and usage tracking; it does not relay audio. The current Pro route requests `universal-3-6-pro`, `mode=min_latency`, `interruption_delay=0`, `continuous_partials=true`, `include_partial_turns=true`, `format_turns=false`, min/max turn silence 128/640 ms. Packet target is 60 ms. Audio is mono PCM16 at the declared native rate; there is no resampling stage in the active system-capture path. A resampler module's presence does not mean that it is used.

Implementation references: `electron/audio/FirebaseManagedSTT.ts`, `electron/audio/SystemAudioCapture.ts`, `electron/audio/MicrophoneCapture.ts`, `electron/audio/microphoneWorker.ts`, `native-module/src/lib.rs`, `native-module/src/speaker/core_audio.rs`, `native-module/src/silence_suppression.rs`, `electron/main.ts`, `src/components/NativelyInterface.tsx`, `src/components/ui/RollingTranscript.tsx`. Historical names such as googleSTT or createDeepgramStreamToken do not identify the current provider.

| Finding | Evidence | Confidence |
|---|---|---|
| Mono buffers are treated as stereo | Native trace: ASBD channels=1, buffer channels=1; code substitutes 2 and averages pairs. Independent 750 Hz tone becomes 1500 Hz on built-in speakers. Diagnostic reported-channel policy restores 750 Hz. | High; causal test on both devices |
| EarPods sample clock does not match declared tap rate | Device nominal rate=44100 Hz, tap declares 48000 Hz; corrected mono capture renders 750 Hz as 816.33 Hz, matching 750×48000/44100. | High for tested EarPods; not all devices |
| Wrong channel/rate handling explains slow active packet delivery | Pair averaging halves mono sample count. Nominal 60 ms EarPods packets then need about 60×2×48000/44100=130.6 ms of source time, consistent with the previous ~129 ms observation. | High mechanism; timing varies with callbacks |
| Pro partial cadence limits caption frequency | Corrected continuous/reference tests retain roughly 1.2-second text-changing partial intervals. | High for tested samples; not a universal API guarantee |
| UI is not the dominant delay in these samples | Prior actual-app measurements: IPC 0–1 ms, commit 4.9 ms, provider event to paint opportunity 27.5 ms. Dedicated lab rendering remains measured in tens of milliseconds. | High locally; full production load not tested |
| Token retrieval contributes to startup | Prior actual-app logs: token 1.97–2.10 s; socket ready 2.49–2.64 s from connection start. | High for those logs, not ongoing-word latency |
| Ring-buffer loss or network inference split | Producer push failures are not counted; local write callbacks are not server acknowledgments. | Unmeasured; cannot assign causality |

## Important correction to prior benchmark evidence

The earlier synthetic benchmark used `afconvert -r` as if it guaranteed the output sample rate; its WAVs retained 22.05 kHz while raw PCM was transmitted as 16 kHz. Those measurements describe slowed synthetic speech and should not rank real-tempo model performance. The earlier synthetic capture fixture also combined unresampled 22.05 kHz voice samples with a 48 kHz tone. It is not valid evidence of speech completeness. The independent generated tone still established the channel/clock defect.

This investigation read every valid WAV header, explicitly resampled synthetic references, reran 12 synthetic model sessions, and reran eight device/channel/suppression captures with a correctly resampled 48 kHz voice reference. The six human clips and two noisy human cases were already correctly normalized. There are 36 valid model-comparison sessions. No figures were silently reused from the misclocked synthetic fixtures.

Physical mouth-to-screen latency remains unmeasured. Reference PCM timestamps and double requestAnimationFrame callbacks measure signal-onset-to-paint-opportunity estimates, not native hardware capture time or physical pixels.

Sources and reproducibility: [valid model events and derived metrics](assemblyai-investigation-valid-results.json), [corrected native capture measurements](coreaudio-isolated-capture-corrected.json), [capture replay](assemblyai-capture-replay-corrected.json), [factorial replay](assemblyai-capture-factorial.json), [diagnostic-only patch](coreaudio-diagnostic-only.patch). Native WAVs and the separately compiled addon are in `/tmp/cluegent-stt-native-investigation`; those files are not bundled into the app. The output device was restored to EarPods after the tests. Existing application/native sources and the installed addon were preserved in this investigation. No routing, credentials or deployment changed. Earlier diagnostics already present in the working tree were retained.
