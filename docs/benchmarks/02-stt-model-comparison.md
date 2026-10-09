# Report 2 — Streaming model comparison

## Scope and controls

36 valid sessions: 12 cases/model, identical 16 kHz mono PCM16, 60 ms packets, real-time pacing and the same local network path. Models were exercised in parallel in a dedicated Electron lab, using the existing RollingTranscript component in three separate visible rows. Token/handshake startup is excluded from utterance metrics. Pro models used the same low-latency options; the English fallback used its supported baseline options, with Pro-only flags removed. Each exact requested model was confirmed in the server Begin response. Accepting a connection does not prove that every optional query flag changes server behavior.

Cases: six human conversational EdAcc clips from Southern British English and Mainstream US English speakers; three correctly resampled synthetic short/technical/hesitation references; one artificial technical word-cued reference with independent word boundaries; two versions of a human US clip with deterministic Gaussian noise at 10 and 0 dB SNR. These are pilot samples, not real technical interviews, broad accent coverage, natural competing-speaker noise or a production tail-latency estimate. One run per case/model was performed.

Audio onset and end use amplitude thresholds on the clean reference; noisy variants use the corresponding clean boundaries. Human source recordings do not include independent word-level timestamps in the downloaded rows. Per-word latency is therefore reported only for the word-cued clip; it must not be extrapolated to human continuous interviews. Percentiles use linear interpolation; n is shown.

## Latency — p50 / p95 / maximum milliseconds

| Model | Onset → first partial | Onset → first partial paint | Onset → first correct opening word paint |
|---|---|---|---|
| universal-3-6-pro | 486 / 1144 / 1716 (n=12) | 509 / 1166 / 1742 (n=12) | 528 / 1875 / 2110 (n=11) |
| universal-3-5-pro | 481 / 813 / 983 (n=12) | 509 / 840 / 1009 (n=12) | 534 / 1884 / 2127 (n=11) |
| universal-streaming-english | 1662 / 2664 / 3182 (n=11) | 1689 / 2688 / 3210 (n=11) | 1571 / 2032 / 2105 (n=10) |

First-correct-opening-word means exact normalized agreement with the reference opening word. It does not mean the entire partial is correct. Some opening words were never displayed correctly; those cases have no timing sample.

| Model | Text-changing partial interval | Final event after reference signal end | Provider event → paint opportunity |
|---|---|---|---|
| universal-3-6-pro | 1222 / 1569 / 1673 (n=53) | 931 / 1351 / 1445 (n=12) | 23 / 31 / 33 (n=70) |
| universal-3-5-pro | 1294 / 1536 / 1674 (n=44) | 772 / 1331 / 1452 (n=12) | 25 / 32 / 34 (n=64) |
| universal-streaming-english | 271 / 750 / 1800 (n=142) | 823 / 1462 / 1484 (n=9) | 25 / 32 / 33 (n=154) |

Update intervals are not speech-to-screen latency. Only distinct non-final updates within the same turn are compared. Silence can still occur within turns. Final latency excludes negative results where the last final event preceded the last reference signal activity; that can reflect omitted trailing speech or non-speech tail energy. Missing final results are not recorded as zero.

## Independently timed technical word-cued clip

| Model | Word start → first correct appearance | Word end → first correct appearance | Words never correctly displayed / 18 |
|---|---|---|---|
| universal-3-6-pro | 1531 / 1853 / 1919 (n=18) | 964 / 1294 / 1569 (n=18) | 0/18 |
| universal-3-5-pro | 1637 / 2214 / 2256 (n=18) | 994 / 1670 / 1683 (n=18) | 0/18 |
| universal-streaming-english | 1635 / 1900 / 2130 (n=16) | 1058 / 1339 / 1505 (n=16) | 2/18 |

Words were synthesized separately, trimmed around detected activity, resampled to 16 kHz, concatenated and independently timestamped. The 18 technical words are unique, making first exact occurrence matching unambiguous. Only appearances after the reference word began are counted. This fixture has unnatural word boundaries and is a timing control, not a natural conversation benchmark.

## Final accuracy, missed words, corrections and availability

| Model | Total WER | S / D / I | Reference words | Partial + final clips | Revisions excluding simple appends | Base USD/session hour |
|---|---:|---|---:|---:|---:|---:|
| universal-3-6-pro | 7.0% | 5 / 9 / 0 | 200 | 12/12 | 35 | $.45 |
| universal-3-5-pro | 7.5% | 8 / 7 / 0 | 200 | 12/12 | 54 | $.45 |
| universal-streaming-english | 19.0% | 8 / 27 / 3 | 200 | 11/12 | 0 | $.15 |

S=substitutions, D=deletions (missed reference words), I=insertions. WER can exceed 100% when insertions are numerous. Text normalization lowercases, removes punctuation and joins internal apostrophes/hyphens; fillers remain scored. Revisions are edit-alignment changes to already-present normalized words; appended newly spoken words are excluded. Fewer revisions can mean less correction or omitted content, so revision count alone does not establish quality.

| Model | Human clean WER (6 clips) | Technical/hesitation WER (3) | Word cues WER (1) | 10 dB noise WER (1) | 0 dB noise WER (1) |
|---|---|---|---|---|---|
| universal-3-6-pro | 5.4% (6/111) | 0.0% (0/43) | 0.0% (0/18) | 21.4% (3/14) | 35.7% (5/14) |
| universal-3-5-pro | 8.1% (9/111) | 2.3% (1/43) | 0.0% (0/18) | 7.1% (1/14) | 28.6% (4/14) |
| universal-streaming-english | 13.5% (15/111) | 7.0% (3/43) | 16.7% (3/18) | 21.4% (3/14) | 100.0% (14/14) |

The 7.0% versus 7.5% pooled Pro WER difference is one word in this 200-word corpus and is not strong evidence of a general accuracy ranking. The clean human subset has only 74 reference words and two accent categories. In the 0 dB case 3.5 performed better than 3.6; this prevents claiming a universal 3.6 noise advantage. English fallback failed to return usable partial+final text in one tested noisy case and has more deletions overall.

## SDK, identifiers and costs

The app uses installed `ws@8.21.0` directly, not an installed AssemblyAI SDK. Consequently its supported model IDs are determined by the documented API and server confirmation, not local SDK enums. Verified exact IDs: `universal-3-6-pro`, `universal-3-5-pro`, `universal-streaming-english`. Marketing names and legacy aliases are not used as proof.

Official sources verify base rates of $0.45/hour for Pro and $0.15/hour for Universal-Streaming English. Streaming is billed on session duration, not transmitted speech bytes. Two simultaneous Pro connections (mic + system) therefore cost approximately $0.90 per listening hour at base rates; two English connections cost $0.30/hour. Silence suppression does not by itself reduce session-duration charges. Rates exclude optional add-ons/discounts.

Sources: [AssemblyAI model/pricing documentation](https://www.assemblyai.com/docs/getting-started/models), [3.6 release and unchanged Pro price](https://www.assemblyai.com/blog/universal-3-6-pro-realtime), [streaming billing](https://support.assemblyai.com/articles/3853403741-how-does-pricing-work), [SDK parameter reference](https://assemblyai.github.io/assemblyai-node-sdk/types/StreamingTranscriberParams.html), [EdAcc dataset](https://huggingface.co/datasets/edinburghcstr/edacc).

Sources and reproducibility: [valid model events and derived metrics](assemblyai-investigation-valid-results.json), [corrected native capture measurements](coreaudio-isolated-capture-corrected.json), [capture replay](assemblyai-capture-replay-corrected.json), [factorial replay](assemblyai-capture-factorial.json), [diagnostic-only patch](coreaudio-diagnostic-only.patch). Native WAVs and the separately compiled addon are in `/tmp/cluegent-stt-native-investigation`; those files are not bundled into the app. The output device was restored to EarPods after the tests. Existing application/native sources and the installed addon were preserved in this investigation. No routing, credentials or deployment changed. Earlier diagnostics already present in the working tree were retained.

## Corrected packet-size recheck

Same correctly resampled continuous technical sentence; one run/model/size. All connections confirmed the requested model. Values are first partial paint opportunity from the reference onset (ms), not per-word latency.

| Model | 50 ms | 60 ms | 100 ms |
|---|---:|---:|---:|
| universal-3-6-pro | 427 | 476 | 398 |
| universal-3-5-pro | 412 | 476 | 412 |
| universal-streaming-english | 1383 | 1943 | 1379 |

The 50/100 ms Pro update medians remained approximately 1.21–1.23 seconds. Differences in first-partial timing do not establish a consistent packet-size benefit. Keep 60 ms; repeat randomized trials before tuning. This replaces the misclocked earlier synthetic packet comparison.

## Continuous sentence versus hesitation

Text-changing partial intervals, p50 / p95 / max ms. Each condition is one correctly resampled synthetic case/model; n counts within-turn intervals.

| Model | Continuous technical sentence | Hesitation sentence |
|---|---|---|
| universal-3-6-pro | 1399 / 1605 / 1641 (n=7) | 1234 / 1271 / 1275 (n=5) |
| universal-3-5-pro | 1341 / 1579 / 1648 (n=7) | 1229 / 1330 / 1341 (n=3) |
| universal-streaming-english | 409 / 649 / 955 (n=19) | 323 / 673 / 767 (n=14) |

Pauses can trigger early/final updates and turn boundaries. These intervals cannot be used as mouth-to-screen or per-word latency.
