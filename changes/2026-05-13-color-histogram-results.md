# Color Histogram Results

Metric: percentage of corrected artefact labels correctly recognized.

Dataset: `Corrected_Analysis.json`

Corrected labels used: `33`

Best color-only result:

| Configuration | Correct | Accuracy |
| --- | ---: | ---: |
| hist-damaged | 15/33 | 45.45% |
| hist-max-restored-damaged | 14/33 | 42.42% |

Previous best:

| Configuration | Correct | Accuracy |
| --- | ---: | ---: |
| damaged-only-shape | 8/33 | 24.24% |

Conclusion: comparing foreground color histograms after removing only the bank background color is significantly better on the corrected data.

Code change applied: live matcher now ranks by damaged-reference color histogram similarity.
