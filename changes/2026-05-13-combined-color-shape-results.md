# Combined Color And Shape Results

Metric: percentage of corrected artefact labels correctly recognized.

Dataset: `Corrected_Analysis.json`

Corrected labels used: `33`

Best result:

| Configuration | Correct | Accuracy |
| --- | ---: | ---: |
| combo-damaged-hist70-shape30 | 19/33 | 57.58% |
| combo-damaged-hist50-shape50 | 18/33 | 54.55% |
| combo-damaged-hist60-shape40 | 18/33 | 54.55% |
| combo-damaged-hist50-shape30-edge20 | 18/33 | 54.55% |
| combo-damaged-hist40-shape60 | 17/33 | 51.52% |

Code change applied: live matcher now ranks by `70%` damaged-reference foreground color histogram similarity plus `30%` damaged-reference shape score.
