# Accuracy Optimization Results

Metric: percentage of corrected artefact labels correctly recognized.

Dataset: `Corrected_Analysis.json`

Corrected labels used: `33`

Target requested: `>26%`

Best result found: `8/33 = 24.24%`

Top configurations:

| Configuration | Correct | Accuracy |
| --- | ---: | ---: |
| target-rs0.2-ds0.6-re0.05-de0.1-rd0-dd0.05-c0 | 8/33 | 24.24% |
| target-rs0.25-ds0.6-re0-de0.1-rd0-dd0.05-c0 | 8/33 | 24.24% |
| iteration-7-damaged-only-shape | 8/33 | 24.24% |
| target-rs0.15-ds0.7-re0-de0.1-rd0-dd0.05-c0 | 8/33 | 24.24% |
| target-rs0-ds1-re0-de0-rd0-dd0-c0 | 8/33 | 24.24% |

Conclusion: the current hand-built feature set did not reach `>26%`. The bottleneck is not only weight selection; the current crop/fingerprint representation is losing too much item-specific detail.

Recommended next algorithm step: switch from global 32x32 silhouette scoring to local feature matching or learned template matching over the corrected examples.
