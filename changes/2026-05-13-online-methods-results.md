# Online Comparison Method Results

Methods tested based on OpenCV documentation:

- histogram intersection
- histogram correlation
- Bhattacharyya-style histogram similarity
- alternative chi-square histogram similarity
- normalized pixel/template similarity
- combinations with damaged-reference shape scoring

Dataset: `Corrected_Analysis.json`

Corrected labels: `33`

Best results:

| Method | Correct | Accuracy |
| --- | ---: | ---: |
| combo-chialt70-shape30 | 22/33 | 66.67% |
| combo-damaged-hist70-shape30 | 19/33 | 57.58% |
| combo-damaged-hist50-shape30-edge20 | 18/33 | 54.55% |
| combo-damaged-hist60-shape40 | 18/33 | 54.55% |
| combo-damaged-hist50-shape50 | 18/33 | 54.55% |
| combo-bhattacharyya70-shape30 | 18/33 | 54.55% |

Code change applied: live matcher now ranks by `70%` damaged-reference alternative chi-square histogram similarity plus `30%` damaged-reference shape score.

Sources:

- https://docs.opencv.org/4.x/d8/dc8/tutorial_histogram_comparison.html
- https://docs.opencv.org/3.4/d4/dc6/tutorial_py_template_matching.html
