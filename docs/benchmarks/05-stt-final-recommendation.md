# Report 5 — Final recommendation

Fix the system-audio PCM path before changing STT models. The tested CoreAudio channel error has a direct causal signature and affects every provider receiving that PCM. A model switch can mask capture corruption without correcting it.

For the next production candidate, retain `universal-3-6-pro`, `mode=min_latency`, `interruption_delay=0`, `continuous_partials=true`, immediate partial rendering and 60 ms frames while validating capture repair. The corrected pilot provides no compelling broad speed advantage for 3.5. This is a conservative release recommendation, not a claim that 3.6 is universally most accurate.

| Criterion | Evidence-based ranking |
|---|---|
| First correct opening word | 3.6 and 3.5 approximately tied (~528/~534 ms p50), English slower (~1571 ms); limited reference-onset estimate |
| Frequent text-changing updates | English faster (~271 ms p50), then 3.6 (~1222 ms), then 3.5 (~1294 ms) in this mixed corpus |
| Accuracy | 3.6 7.0%, 3.5 7.5%, English 19.0% pooled WER; one-word Pro difference is not conclusive |
| Real interviews | Not established: human samples are conversational, two accent categories, no full live technical interviews |
| System reliability | Capture repair is the primary requirement; do not rank models on malformed PCM |
| Stability | 3.6 had fewer revisions than 3.5; English had fewer revisions but more omissions/errors |
| Cost | English $0.15/session-hour versus Pro $0.45/session-hour; dual open connections double base listening-hour cost |

A speed-focused English caption mode is worth a controlled product trial after capture repair because it updates more frequently. It should not replace Pro by default on this evidence: correct-word appearance was not consistently faster, technical/noisy accuracy was worse, and one noisy clip lacked usable partial+final output. An accuracy-focused Pro mode and a speed-focused English mode may be appropriate only if users understand the tradeoff and representative tests pass. No such mode or routing change has been implemented.

The prior apparent 3.5 first-opening-word advantage does not hold in the corrected broader pilot. Its earlier comparison used misclocked synthetic audio. Neither version numbering nor a single opening word should decide the model.

Approval is required before applying capture fixes to production source, as requested in the pasted task. The diagnostic source copy and patch demonstrate the suspected change but intentionally leave production files untouched. The proposed initial scope is described in Report 4; device-format and clock validation must accompany the implementation.

Sources and reproducibility: [valid model events and derived metrics](assemblyai-investigation-valid-results.json), [corrected native capture measurements](coreaudio-isolated-capture-corrected.json), [capture replay](assemblyai-capture-replay-corrected.json), [factorial replay](assemblyai-capture-factorial.json), [diagnostic-only patch](coreaudio-diagnostic-only.patch). Native WAVs and the separately compiled addon are in `/tmp/cluegent-stt-native-investigation`; those files are not bundled into the app. The output device was restored to EarPods after the tests. Existing application/native sources and the installed addon were preserved in this investigation. No routing, credentials or deployment changed. Earlier diagnostics already present in the working tree were retained.
