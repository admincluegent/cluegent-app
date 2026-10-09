> Later audit: synthetic WAV conversion retained 22.05 kHz while the benchmark declared 16 kHz. These are slowed-speech measurements, not a valid real-tempo comparison. See the corrected investigation report.

# AssemblyAI live-streaming comparison — 9 October 2026

Tested the actual public streaming APIs with identical audio and settings, paced in real time. Each requested model was confirmed in its Begin message. The app configuration was unchanged.

## Clean speech

Three English meeting/interview/follow-up clips synthesized with macOS `say` at 185 words/minute, repeated twice: six runs per model, 196 reference words per model, 98 reference words across the three distinct clips. Paired models ran simultaneously.

| Metric | 3.5 Pro | 3.6 Pro |
|---|---:|---:|
| First partial (median) | 460 ms | 461 ms |
| Time between partial updates (median of run medians) | 1219 ms | 1218 ms |
| Final transcript after speech ends (median) | 517 ms | 521 ms |
| Connection ready (median; token creation excluded) | 1198 ms | 1192 ms |
| Clean final word errors | 0/196 (0% WER) | 0/196 (0% WER) |

The overall first-text and final-text timings are effectively tied. In the meeting clip specifically, 3.5 first displayed text at 338–341 ms, versus 644–646 ms for 3.6; the other clean clips were similar. Early text was not always correct: 3.6 initially showed “The reason” for “The release,” and both initially showed “You're” for “Yes.” These were corrected before finalization. A zero final WER does not mean all live partials were correct.

## Controlled noise

The same interview audio was mixed with deterministic Gaussian noise: 10 dB SNR (speech power ten times noise power) and 0 dB SNR (equal power). One run per model per noise level; neither condition represents a human meeting dataset.

| Noise | 3.5 final WER | 3.6 final WER | 3.5 final delay | 3.6 final delay |
|---|---:|---:|---:|---:|
| 10 dB | 0/35 (0.00%) | 0/35 (0.00%) | 549 ms | 550 ms |
| 0 dB | 1/35 (2.86%) | 0/35 (0.00%) | 672 ms | 547 ms |

At 0 dB, 3.5 wrote “dupli-cat payments”; 3.6 wrote the correct “duplicate payments.” This is a small observed advantage, not enough evidence for a general accuracy ranking.

## Settings and limits

Default edge endpoint; `min_latency`; 16 kHz PCM16 mono; 60 ms packets; partials enabled; continuous partials enabled; minimum silence 128 ms, maximum 640 ms; interruption delay zero; English pinned. All parameters except `speech_model` were identical. Timings use actual packet-send timestamps and exclude token creation/startup unless explicitly labeled. Speech boundaries are amplitude estimates with approximately one packet of timing resolution, so differences of a few milliseconds are not meaningful. WER uses Levenshtein word edits, ignores case/punctuation, and joins internally hyphenated/apostrophized words; “trade-offs” and “tradeoffs” are treated as equivalent.

No microphone capture, UI rendering delay, human accents, background speakers, production load, or real meeting audio were evaluated. Synthetic clips and single noisy runs cannot establish universal performance. Retain 3.6 Pro for now; these results do not show a meaningful overall speed advantage from switching to 3.5.

## Live transcription timelines

Examples from the first clean run. Times are milliseconds after the estimated first speech was sent; partial text is provisional.

### meeting

| Time | Model | Partial transcript |
|---:|---|---|
| 341 ms | 3.5 | The |
| 646 ms | 3.6 | The reason |
| 1563 ms | 3.5 | The release is planned |
| 1861 ms | 3.6 | The release is planned for February |
| 2470 ms | 3.6 | The release is planned for Friday. |
| 2596 ms | 3.5 | The release is planned for Friday. |

### followup

| Time | Model | Partial transcript |
|---:|---|---|
| 460 ms | 3.5 | You're |
| 461 ms | 3.6 | You're |
| 1675 ms | 3.6 | Yes, that makes sense. |
| 1746 ms | 3.5 | Yes, that makes sense. |
| 2589 ms | 3.6 | No, |
| 2594 ms | 3.5 | No. |

## Final transcription examples

### meeting

Reference: The release is planned for Friday. Please confirm that the microphone permissions are ready. We should test screen sharing before the meeting and send the action items to the engineering team.

3.5: The release is planned for Friday. Please confirm that the microphone permissions are ready. We should test screen sharing before the meeting and send the action items to the engineering team.

3.6: The release is planned for Friday. Please confirm that the microphone permissions are ready. We should test screen sharing before the meeting and send the action items to the engineering team.

### interview

Reference: Can you explain how you prevent duplicate payments in a distributed system? Describe how transactions and retries work together. What would happen if the server stopped after charging the customer but before saving the response?

3.5: Can you explain how you prevent duplicate payments in a distributed system? Describe how transactions and retries work together. What would happen if the server stopped after charging the customer but before saving the response?

3.6: Can you explain how you prevent duplicate payments in a distributed system? Describe how transactions and retries work together. What would happen if the server stopped after charging the customer but before saving the response?

### followup

Reference: Yes, that makes sense. No, I meant the monthly subscription, not the annual plan. Could you give a concrete example? Please explain the tradeoffs between latency and accuracy for live meeting captions.

3.5: Yes, that makes sense. No. I meant the monthly subscription. Not the annual plan. Could you give a concrete example? Please explain the trade-offs between latency and accuracy for live meeting captions.

3.6: Yes, that makes sense. No, I meant the monthly subscription. Not the annual plan. Could you give a concrete example? Please explain the trade-offs between latency and accuracy for live meeting captions.

Raw results, including every partial/final event: [clean](./assemblyai-streaming-2026-10-09.json), [noise](./assemblyai-streaming-2026-10-09-noise.json).

Reproduce: `node scripts/benchmark-stt-models.cjs` and `node scripts/benchmark-stt-models.cjs docs/benchmarks/assemblyai-streaming-2026-10-09-noise.json --noise`.
