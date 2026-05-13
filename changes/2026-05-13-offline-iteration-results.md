# Offline Iteration Results

Dataset: `Corrected_Analysis.json`

Corrected labels used: `33`

| Iteration | Correct | Accuracy |
| --- | ---: | ---: |
| iteration-0-exported-original | 0/33 | 0% |
| iteration-1-shape-only | 6/33 | 18.18% |
| iteration-2-shape-edge | 5/33 | 15.15% |
| iteration-3-shape-edge-descriptor | 3/33 | 9.09% |
| iteration-4-restored-balanced | 3/33 | 9.09% |
| iteration-5-damaged-shape-added | 3/33 | 9.09% |
| iteration-6-damaged-heavy | 3/33 | 9.09% |
| iteration-7-damaged-only-shape | 8/33 | 24.24% |
| iteration-8-damaged-only-balanced | 7/33 | 21.21% |
| iteration-9-descriptor-only | 0/33 | 0% |
| iteration-10-color-light-only | 0/33 | 0% |
| iteration-11-max-damaged-restored-shape | 7/33 | 21.21% |

Best result: `iteration-7-damaged-only-shape` at `24.24%`.

Code change applied: live matcher now ranks primarily by damaged reference shape score, matching the best offline iteration.
