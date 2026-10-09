# Cluegent — Complete STT investigation, 2026-10-09

The investigation found a causally demonstrated CoreAudio mono-decoding defect, a tested EarPods source-clock mismatch, and provider cadence as a separate limit on caption frequency. It also corrected the synthetic test-fixture sample-rate error, rather than treating earlier timing numbers as production evidence.

- [Report 1: root causes and confidence](01-stt-root-cause-analysis.md)
- [Report 2: corrected model comparison, word timing, WER and costs](02-stt-model-comparison.md)
- [Report 3: device, format, suppression and PCM completeness tests](03-stt-system-audio-investigation.md)
- [Report 4: prioritized optimization and release acceptance plan](04-stt-optimization-plan.md)
- [Report 5: configuration/model recommendation and approval scope](05-stt-final-recommendation.md)

Work performed: 36 valid model comparison sessions plus six corrected packet-size rechecks; eight corrected device/channel/suppression capture trials; nine short recorded-PCM replay sessions. Misclocked synthetic experiments were retained and labeled, not used for the corrected model ranking. Exact physical speech-to-screen and per-word latency for natural human interviews remain unmeasured; independent artificial word boundaries and paint opportunities are reported with their limitations.

Reproduce the derived results with `python3 scripts/analyze-stt-investigation.py` and the reports with `python3 scripts/write-stt-investigation-reports.py` while the temporary lab assets remain available. Local experimental renderers and benchmark entry points are under `.stt-lab`. No production source change, model/routing/credential update, native-addon replacement or deployment was performed in this investigation.
