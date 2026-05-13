# Increased Shape Weight Results

Metric: percentage of corrected artefact labels correctly recognized.

Dataset: `Corrected_Analysis.json`

Corrected labels: `33`

Results:

| Method | Correct | Accuracy |
| --- | ---: | ---: |
| combo-chialt70-shape30 | 22/33 | 66.67% |
| combo-chialt60-shape40 | 22/33 | 66.67% |
| combo-chialt50-shape50 | 20/33 | 60.61% |
| combo-chialt40-shape60 | 19/33 | 57.58% |
| combo-chialt30-shape70 | 18/33 | 54.55% |

Code change applied: live matcher now uses `60%` damaged-reference alternative chi-square histogram similarity plus `40%` damaged-reference shape score.

UI change applied: recognition info now shows overlap percentage.
