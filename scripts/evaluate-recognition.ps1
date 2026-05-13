param(
  [string]$AnalysisPath = "Corrected_Analysis.json",
  [string]$DatabasePath = "data/damaged-artifacts.json",
  [string]$ScreenshotPath = "Damaged_Items.png",
  [string[]]$OnlyRestoredNames = @(),
  [string[]]$OnlyCandidateRestoredNames = @()
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing

Add-Type -ReferencedAssemblies "System.Drawing" -TypeDefinition @"
using System;
using System.Drawing;

public class Fingerprint {
    public bool[] Visible = new bool[1024];
    public double[] R = new double[1024];
    public double[] G = new double[1024];
    public double[] B = new double[1024];
    public bool[] Edge = new bool[1024];
    public double Aspect;
    public double Fill;
    public double CenterX;
    public double CenterY;
    public double[] Hist = new double[64];
}

public class MatchScore {
    public double Shape;
    public double Edge;
    public double Descriptor;
    public double Color;
    public double Light;
    public double Overlap;
}

public static class ImageEval {
    public const int Size = 32;

    public static Fingerprint FromReference(string path) {
        using (var source = new Bitmap(path))
        using (var resized = new Bitmap(Size, Size)) {
            using (var g = Graphics.FromImage(resized)) {
                g.Clear(Color.Transparent);
                g.DrawImage(source, 0, 0, Size, Size);
            }
            return Build(resized, false);
        }
    }

    public static Fingerprint FromCrop(string path, int x, int y, int w, int h) {
        int insetX = Math.Max(1, (int)Math.Round(w * 0.04));
        int insetTop = Math.Max(1, (int)Math.Round(h * 0.04));
        int insetBottom = Math.Max(1, (int)Math.Round(h * 0.04));
        x += insetX;
        y += insetTop;
        w = Math.Max(8, w - insetX * 2);
        h = Math.Max(8, h - insetTop - insetBottom);

        using (var source = new Bitmap(path))
        using (var crop = new Bitmap(w, h)) {
            using (var g = Graphics.FromImage(crop)) {
                g.DrawImage(source, new Rectangle(0, 0, w, h), new Rectangle(x, y, w, h), GraphicsUnit.Pixel);
            }

            Rectangle bounds = ForegroundBounds(crop);
            using (var resized = new Bitmap(Size, Size)) {
                using (var g = Graphics.FromImage(resized)) {
                    g.Clear(Color.Transparent);
                    if (bounds.Width > 0 && bounds.Height > 0) {
                        double longest = Math.Max(bounds.Width, bounds.Height);
                        int drawW = (int)Math.Ceiling(bounds.Width / longest * Size);
                        int drawH = (int)Math.Ceiling(bounds.Height / longest * Size);
                        int dx = (Size - drawW) / 2;
                        int dy = (Size - drawH) / 2;
                        g.DrawImage(crop, new Rectangle(dx, dy, drawW, drawH), bounds, GraphicsUnit.Pixel);
                    }
                }
                return Build(resized, true);
            }
        }
    }

    static Rectangle ForegroundBounds(Bitmap bitmap) {
        int minX = bitmap.Width, minY = bitmap.Height, maxX = -1, maxY = -1;
        for (int y = 0; y < bitmap.Height; y++) {
            for (int x = 0; x < bitmap.Width; x++) {
                var c = bitmap.GetPixel(x, y);
                if (!IsScreenshotShapePixel(c.R, c.G, c.B)) continue;
                minX = Math.Min(minX, x);
                minY = Math.Min(minY, y);
                maxX = Math.Max(maxX, x);
                maxY = Math.Max(maxY, y);
            }
        }
        if (maxX < minX || maxY < minY) return Rectangle.Empty;
        return new Rectangle(minX, minY, maxX - minX + 1, maxY - minY + 1);
    }

    static Fingerprint Build(Bitmap bitmap, bool screenshot) {
        var fp = new Fingerprint();
        int minX = Size, minY = Size, maxX = -1, maxY = -1, count = 0;
        double sumX = 0, sumY = 0;

        for (int y = 0; y < Size; y++) {
            for (int x = 0; x < Size; x++) {
                int i = y * Size + x;
                var c = bitmap.GetPixel(x, y);
                bool visible = screenshot
                    ? c.A > 20 && IsScreenshotShapePixel(c.R, c.G, c.B)
                    : c.A > 20;
                fp.Visible[i] = visible;
                if (visible) {
                    fp.R[i] = c.R;
                    fp.G[i] = c.G;
                    fp.B[i] = c.B;
                    minX = Math.Min(minX, x);
                    minY = Math.Min(minY, y);
                    maxX = Math.Max(maxX, x);
                    maxY = Math.Max(maxY, y);
                    sumX += x;
                    sumY += y;
                    count++;
                }
            }
        }

        for (int y = 0; y < Size; y++) {
            for (int x = 0; x < Size; x++) {
                int i = y * Size + x;
                if (!fp.Visible[i]) continue;
                bool edge = y == 0 || y == Size - 1 || x == 0 || x == Size - 1 ||
                    !fp.Visible[(Math.Max(y - 1, 0)) * Size + x] ||
                    !fp.Visible[(Math.Min(y + 1, Size - 1)) * Size + x] ||
                    !fp.Visible[y * Size + Math.Max(x - 1, 0)] ||
                    !fp.Visible[y * Size + Math.Min(x + 1, Size - 1)];
                fp.Edge[i] = edge;
            }
        }

        if (count == 0) {
            fp.Aspect = 1;
            fp.Fill = 0;
            fp.CenterX = 0.5;
            fp.CenterY = 0.5;
        } else {
            int bw = maxX - minX + 1;
            int bh = maxY - minY + 1;
            fp.Aspect = bw / Math.Max((double)bh, 1.0);
            fp.Fill = count / Math.Max((double)(bw * bh), 1.0);
            fp.CenterX = sumX / count / Size;
            fp.CenterY = sumY / count / Size;
        }

        double histTotal = 0;
        for (int y = 0; y < Size; y++) {
            for (int x = 0; x < Size; x++) {
                var c = bitmap.GetPixel(x, y);
                if (c.A <= 20) continue;
                if (screenshot && IsBankBackground(c.R, c.G, c.B)) continue;
                if (screenshot && IsQuantityPixel(c.R, c.G, c.B)) continue;
                int rb = Math.Min(c.R / 64, 3);
                int gb = Math.Min(c.G / 64, 3);
                int bb = Math.Min(c.B / 64, 3);
                int hi = rb * 16 + gb * 4 + bb;
                fp.Hist[hi] += 1;
                histTotal += 1;
            }
        }
        if (histTotal > 0) {
            for (int i = 0; i < fp.Hist.Length; i++) fp.Hist[i] /= histTotal;
        }

        return fp;
    }

    public static MatchScore Compare(Fingerprint a, Fingerprint b) {
        int overlap = 0, visibleUnion = 0, visibleA = 0, visibleB = 0, edgeOverlap = 0, edgeUnion = 0;
        double colorScore = 0, lightScore = 0;

        for (int i = 0; i < Size * Size; i++) {
            if (a.Visible[i]) visibleA++;
            if (b.Visible[i]) visibleB++;
            if (a.Visible[i] || b.Visible[i]) visibleUnion++;
            if (a.Edge[i] || b.Edge[i]) edgeUnion++;
            if (a.Edge[i] && b.Edge[i]) edgeOverlap++;
            if (!a.Visible[i] || !b.Visible[i]) continue;
            overlap++;
            double colorDistance = Math.Abs(a.R[i] - b.R[i]) + Math.Abs(a.G[i] - b.G[i]) + Math.Abs(a.B[i] - b.B[i]);
            double lightA = (a.R[i] + a.G[i] + a.B[i]) / 3.0;
            double lightB = (b.R[i] + b.G[i] + b.B[i]) / 3.0;
            colorScore += 1.0 - Math.Min(colorDistance / 765.0, 1.0);
            lightScore += 1.0 - Math.Min(Math.Abs(lightA - lightB) / 255.0, 1.0);
        }

        if (visibleUnion == 0 || overlap == 0) return new MatchScore();
        double coverageA = overlap / Math.Max((double)visibleA, 1.0);
        double coverageB = overlap / Math.Max((double)visibleB, 1.0);
        double shape = Math.Sqrt(coverageA * coverageB);
        double edge = edgeUnion > 0 ? edgeOverlap / (double)edgeUnion : shape;
        double descriptor = CompareDescriptors(a, b);
        return new MatchScore {
            Shape = shape,
            Edge = edge,
            Descriptor = descriptor,
            Color = colorScore / overlap,
            Light = lightScore / overlap,
            Overlap = overlap / (double)visibleUnion
        };
    }

    public static double HistogramSimilarity(Fingerprint a, Fingerprint b) {
        double intersection = 0;
        for (int i = 0; i < a.Hist.Length; i++) {
            intersection += Math.Min(a.Hist[i], b.Hist[i]);
        }
        return intersection;
    }

    public static double HistogramCorrelation(Fingerprint a, Fingerprint b) {
        double meanA = 0, meanB = 0;
        for (int i = 0; i < a.Hist.Length; i++) {
            meanA += a.Hist[i];
            meanB += b.Hist[i];
        }
        meanA /= a.Hist.Length;
        meanB /= b.Hist.Length;
        double numerator = 0, denomA = 0, denomB = 0;
        for (int i = 0; i < a.Hist.Length; i++) {
            double da = a.Hist[i] - meanA;
            double db = b.Hist[i] - meanB;
            numerator += da * db;
            denomA += da * da;
            denomB += db * db;
        }
        if (denomA <= 0 || denomB <= 0) return 0;
        return Math.Max(0, (numerator / Math.Sqrt(denomA * denomB) + 1) / 2);
    }

    public static double HistogramBhattacharyya(Fingerprint a, Fingerprint b) {
        double coefficient = 0;
        for (int i = 0; i < a.Hist.Length; i++) {
            coefficient += Math.Sqrt(a.Hist[i] * b.Hist[i]);
        }
        return Math.Max(0, Math.Min(1, coefficient));
    }

    public static double HistogramChiAlt(Fingerprint a, Fingerprint b) {
        double distance = 0;
        for (int i = 0; i < a.Hist.Length; i++) {
            double denom = a.Hist[i] + b.Hist[i];
            if (denom <= 0) continue;
            double diff = a.Hist[i] - b.Hist[i];
            distance += 2 * diff * diff / denom;
        }
        return 1.0 / (1.0 + distance);
    }

    public static double PixelNcc(Fingerprint a, Fingerprint b) {
        double meanA = 0, meanB = 0;
        int count = 0;
        for (int i = 0; i < Size * Size; i++) {
            if (!a.Visible[i] || !b.Visible[i]) continue;
            meanA += (a.R[i] + a.G[i] + a.B[i]) / 3.0;
            meanB += (b.R[i] + b.G[i] + b.B[i]) / 3.0;
            count++;
        }
        if (count == 0) return 0;
        meanA /= count;
        meanB /= count;
        double numerator = 0, denomA = 0, denomB = 0;
        for (int i = 0; i < Size * Size; i++) {
            if (!a.Visible[i] || !b.Visible[i]) continue;
            double va = (a.R[i] + a.G[i] + a.B[i]) / 3.0 - meanA;
            double vb = (b.R[i] + b.G[i] + b.B[i]) / 3.0 - meanB;
            numerator += va * vb;
            denomA += va * va;
            denomB += vb * vb;
        }
        if (denomA <= 0 || denomB <= 0) return 0;
        return Math.Max(0, (numerator / Math.Sqrt(denomA * denomB) + 1) / 2);
    }

    static double CompareDescriptors(Fingerprint a, Fingerprint b) {
        double aspectScore = 1.0 - Math.Min(Math.Abs(Math.Log(a.Aspect) - Math.Log(b.Aspect)) / 1.6, 1.0);
        double fillScore = 1.0 - Math.Min(Math.Abs(a.Fill - b.Fill) / 0.65, 1.0);
        double centerScore = 1.0 - Math.Min((Math.Abs(a.CenterX - b.CenterX) + Math.Abs(a.CenterY - b.CenterY)) / 0.75, 1.0);
        return aspectScore * 0.45 + fillScore * 0.35 + centerScore * 0.2;
    }

    static bool IsForeground(int r, int g, int b) {
        int bgDistance = Math.Abs(r - 48) + Math.Abs(g - 43) + Math.Abs(b - 38);
        bool tooDark = r < 24 && g < 24 && b < 24;
        return bgDistance > 28 && !tooDark;
    }

    static bool IsGridItemPixel(int r, int g, int b) {
        if (!IsForeground(r, g, b)) return false;
        bool titleText = r > 160 && g > 115 && b < 70;
        bool frameGold = r > 85 && g > 50 && g < 135 && b < 55;
        bool scrollbar = r > 145 && g > 100 && b > 45 && r > b + 45;
        bool bankLine = r > 55 && r < 120 && g > 40 && g < 95 && b < 55;
        return !titleText && !frameGold && !scrollbar && !bankLine;
    }

    static bool IsScreenshotShapePixel(int r, int g, int b) {
        if (IsBankBackground(r, g, b)) return false;
        if (IsQuantityPixel(r, g, b)) return false;
        bool frameGold = r > 85 && g > 50 && g < 135 && b < 55;
        bool scrollbar = r > 145 && g > 100 && b > 45 && r > b + 45;
        bool bankLine = r > 55 && r < 120 && g > 40 && g < 95 && b < 55;
        return !frameGold && !scrollbar && !bankLine;
    }

    static bool IsQuantityPixel(int r, int g, int b) {
        return r > 125 && g > 105 && b < 85 && r >= g - 20;
    }

    static bool IsBankBackground(int r, int g, int b) {
        return r == 48 && g == 43 && b == 38;
    }
}
"@

$analysis = Get-Content $AnalysisPath -Raw | ConvertFrom-Json
$database = Get-Content $DatabasePath -Raw | ConvertFrom-Json
$labels = @($analysis.detections | Where-Object { $_.correctedArtefact -eq $true })

if ($OnlyRestoredNames.Count -gt 0) {
  $targetNames = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::OrdinalIgnoreCase)
  foreach ($name in $OnlyRestoredNames) {
    [void]$targetNames.Add($name)
  }
  $labels = @($labels | Where-Object {
    $truth = $_.correction.restoredName
    if (-not $truth) { $truth = $_.trainingLabel.label.restoredName }
    $targetNames.Contains($truth)
  })
}

if ($labels.Count -eq 0) {
  throw "No corrected labels found in $AnalysisPath"
}

$refs = @()
$candidateNames = $null
if ($OnlyCandidateRestoredNames.Count -gt 0) {
  $candidateNames = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::OrdinalIgnoreCase)
  foreach ($name in $OnlyCandidateRestoredNames) {
    [void]$candidateNames.Add($name)
  }
}
foreach ($item in $database.items) {
  if (-not $item.icon) { continue }
  if ($candidateNames -and -not $candidateNames.Contains($item.restoredName)) { continue }
  $restoredPath = Join-Path "data" $item.icon
  $damagedPath = if ($item.damagedIcon) { Join-Path "data" $item.damagedIcon } else { $null }
  $refs += [pscustomobject]@{
    Name = $item.name
    RestoredName = $item.restoredName
    Restored = [ImageEval]::FromReference((Resolve-Path $restoredPath))
    Damaged = if ($damagedPath -and (Test-Path $damagedPath)) { [ImageEval]::FromReference((Resolve-Path $damagedPath)) } else { $null }
  }
}

$configs = @(
  [pscustomobject]@{ Name = "iteration-0-exported-original"; RestoredShape = 1.0; RestoredEdge = 0.0; RestoredDescriptor = 0.0; RestoredColor = 0.0; RestoredLight = 0.0; DamagedShape = 0.0; DamagedEdge = 0.0; DamagedDescriptor = 0.0; DamagedColor = 0.0; DamagedLight = 0.0 },
  [pscustomobject]@{ Name = "iteration-1-shape-only"; RestoredShape = 1.0; RestoredEdge = 0.0; RestoredDescriptor = 0.0; RestoredColor = 0.0; RestoredLight = 0.0; DamagedShape = 0.0; DamagedEdge = 0.0; DamagedDescriptor = 0.0; DamagedColor = 0.0; DamagedLight = 0.0 },
  [pscustomobject]@{ Name = "iteration-2-shape-edge"; RestoredShape = 0.7; RestoredEdge = 0.3; RestoredDescriptor = 0.0; RestoredColor = 0.0; RestoredLight = 0.0; DamagedShape = 0.0; DamagedEdge = 0.0; DamagedDescriptor = 0.0; DamagedColor = 0.0; DamagedLight = 0.0 },
  [pscustomobject]@{ Name = "iteration-3-shape-edge-descriptor"; RestoredShape = 0.55; RestoredEdge = 0.25; RestoredDescriptor = 0.2; RestoredColor = 0.0; RestoredLight = 0.0; DamagedShape = 0.0; DamagedEdge = 0.0; DamagedDescriptor = 0.0; DamagedColor = 0.0; DamagedLight = 0.0 },
  [pscustomobject]@{ Name = "iteration-4-restored-balanced"; RestoredShape = 0.52; RestoredEdge = 0.23; RestoredDescriptor = 0.18; RestoredColor = 0.03; RestoredLight = 0.04; DamagedShape = 0.0; DamagedEdge = 0.0; DamagedDescriptor = 0.0; DamagedColor = 0.0; DamagedLight = 0.0 },
  [pscustomobject]@{ Name = "iteration-5-damaged-shape-added"; RestoredShape = 0.45; RestoredEdge = 0.2; RestoredDescriptor = 0.15; RestoredColor = 0.03; RestoredLight = 0.04; DamagedShape = 0.08; DamagedEdge = 0.03; DamagedDescriptor = 0.02; DamagedColor = 0.0; DamagedLight = 0.0 },
  [pscustomobject]@{ Name = "iteration-6-damaged-heavy"; RestoredShape = 0.35; RestoredEdge = 0.16; RestoredDescriptor = 0.12; RestoredColor = 0.02; RestoredLight = 0.03; DamagedShape = 0.2; DamagedEdge = 0.08; DamagedDescriptor = 0.04; DamagedColor = 0.0; DamagedLight = 0.0 },
  [pscustomobject]@{ Name = "iteration-7-damaged-only-shape"; RestoredShape = 0.0; RestoredEdge = 0.0; RestoredDescriptor = 0.0; RestoredColor = 0.0; RestoredLight = 0.0; DamagedShape = 1.0; DamagedEdge = 0.0; DamagedDescriptor = 0.0; DamagedColor = 0.0; DamagedLight = 0.0 },
  [pscustomobject]@{ Name = "iteration-8-damaged-only-balanced"; RestoredShape = 0.0; RestoredEdge = 0.0; RestoredDescriptor = 0.0; RestoredColor = 0.0; RestoredLight = 0.0; DamagedShape = 0.62; DamagedEdge = 0.22; DamagedDescriptor = 0.10; DamagedColor = 0.03; DamagedLight = 0.03 },
  [pscustomobject]@{ Name = "iteration-9-descriptor-only"; RestoredShape = 0.0; RestoredEdge = 0.0; RestoredDescriptor = 1.0; RestoredColor = 0.0; RestoredLight = 0.0; DamagedShape = 0.0; DamagedEdge = 0.0; DamagedDescriptor = 0.0; DamagedColor = 0.0; DamagedLight = 0.0 },
  [pscustomobject]@{ Name = "iteration-10-color-light-only"; RestoredShape = 0.0; RestoredEdge = 0.0; RestoredDescriptor = 0.0; RestoredColor = 0.55; RestoredLight = 0.45; DamagedShape = 0.0; DamagedEdge = 0.0; DamagedDescriptor = 0.0; DamagedColor = 0.0; DamagedLight = 0.0 },
  [pscustomobject]@{ Name = "iteration-11-max-damaged-restored-shape"; RestoredShape = 0.5; RestoredEdge = 0.0; RestoredDescriptor = 0.0; RestoredColor = 0.0; RestoredLight = 0.0; DamagedShape = 0.5; DamagedEdge = 0.0; DamagedDescriptor = 0.0; DamagedColor = 0.0; DamagedLight = 0.0 }
)

$searchConfigs = @()
$targeted = @(
  @(0, 1, 0, 0, 0, 0, 0),
  @(0, .85, 0, .15, 0, 0, 0),
  @(0, .75, 0, .15, 0, .10, 0),
  @(0, .70, 0, .20, 0, .10, 0),
  @(.15, .70, 0, .10, 0, .05, 0),
  @(.25, .60, 0, .10, 0, .05, 0),
  @(.35, .50, 0, .10, 0, .05, 0),
  @(.20, .65, .05, .05, 0, .05, 0),
  @(.20, .60, .05, .10, 0, .05, 0),
  @(.15, .65, 0, .10, .05, .05, 0),
  @(.10, .75, 0, .05, .05, .05, 0),
  @(.05, .85, 0, .05, 0, .05, 0),
  @(0, .80, 0, .10, 0, .05, .05),
  @(.10, .70, 0, .10, 0, .05, .05),
  @(0, .65, 0, .20, 0, .10, .05)
)
foreach ($values in $targeted) {
  $rs = $values[0]; $ds = $values[1]; $re = $values[2]; $de = $values[3]; $rd = $values[4]; $dd = $values[5]; $color = $values[6]
  $sum = $rs + $ds + $re + $de + $rd + $dd + $color
  $searchConfigs += [pscustomobject]@{
    Name = "target-rs$rs-ds$ds-re$re-de$de-rd$rd-dd$dd-c$color"
    RestoredShape = $rs / $sum
    RestoredEdge = $re / $sum
    RestoredDescriptor = $rd / $sum
    RestoredColor = ($color / 2) / $sum
    RestoredLight = ($color / 2) / $sum
    DamagedShape = $ds / $sum
    DamagedEdge = $de / $sum
    DamagedDescriptor = $dd / $sum
    DamagedColor = 0
    DamagedLight = 0
  }
}

$configs += $searchConfigs

function Score-Match($restoredScore, $damagedScore, $config) {
  $score = 0.0
  $score += $config.RestoredShape * $restoredScore.Shape
  $score += $config.RestoredEdge * $restoredScore.Edge
  $score += $config.RestoredDescriptor * $restoredScore.Descriptor
  $score += $config.RestoredColor * $restoredScore.Color
  $score += $config.RestoredLight * $restoredScore.Light
  if ($damagedScore) {
    $score += $config.DamagedShape * $damagedScore.Shape
    $score += $config.DamagedEdge * $damagedScore.Edge
    $score += $config.DamagedDescriptor * $damagedScore.Descriptor
    $score += $config.DamagedColor * $damagedScore.Color
    $score += $config.DamagedLight * $damagedScore.Light
  }
  return $score
}

$cropCache = @{}
$results = @()

foreach ($config in $configs) {
  $correct = 0
  $examples = @()

  foreach ($label in $labels) {
    $truth = $label.correction.restoredName
    if (-not $truth) { $truth = $label.trainingLabel.label.restoredName }
    $box = $label.box
    $key = "$($box.x),$($box.y),$($box.w),$($box.h)"
    if (-not $cropCache.ContainsKey($key)) {
      $cropCache[$key] = [ImageEval]::FromCrop((Resolve-Path $ScreenshotPath), [int]$box.x, [int]$box.y, [int]$box.w, [int]$box.h)
    }
    $crop = $cropCache[$key]

    if ($config.Name -eq "iteration-0-exported-original") {
      $prediction = $label.originalPrediction.restoredName
      $score = $label.originalPrediction.scores.selected
    } else {
      $bestRef = $null
      $bestScore = -1.0
      foreach ($ref in $refs) {
        $restoredScore = [ImageEval]::Compare($crop, $ref.Restored)
        $damagedScore = if ($ref.Damaged) { [ImageEval]::Compare($crop, $ref.Damaged) } else { $null }
        $candidateScore = Score-Match $restoredScore $damagedScore $config
        if ($candidateScore -gt $bestScore) {
          $bestScore = $candidateScore
          $bestRef = $ref
        }
      }
      $prediction = $bestRef.RestoredName
      $score = $bestScore
    }

    $isCorrect = [string]::Equals($prediction, $truth, [System.StringComparison]::OrdinalIgnoreCase)
    if ($isCorrect) { $correct++ }
    if ($examples.Count -lt 8 -and -not $isCorrect) {
      $examples += [pscustomobject]@{
        BankIndex = $label.bankIndex
        Truth = $truth
        Predicted = $prediction
        Score = [Math]::Round([double]$score, 4)
      }
    }
  }

  $accuracy = $correct / [double]$labels.Count
  $results += [pscustomobject]@{
    Iteration = $config.Name
    Correct = $correct
    Total = $labels.Count
    Accuracy = [Math]::Round($accuracy * 100, 2)
    ExampleFailures = $examples
  }
}

$histogramModes = @(
  "hist-restored",
  "hist-damaged",
  "hist-max-restored-damaged",
  "combo-damaged-hist70-shape30",
  "combo-damaged-hist60-shape40",
  "combo-damaged-hist50-shape50",
  "combo-damaged-hist40-shape60",
  "combo-damaged-hist30-shape70",
  "combo-damaged-hist50-shape30-edge20"
  "hist-correlation-damaged",
  "hist-bhattacharyya-damaged",
  "hist-chialt-damaged",
  "pixel-ncc-damaged",
  "combo-bhattacharyya70-shape30",
  "combo-correlation70-shape30",
  "combo-chialt70-shape30",
  "combo-chialt60-shape40",
  "combo-chialt50-shape50",
  "combo-chialt40-shape60",
  "combo-chialt30-shape70"
)
foreach ($mode in $histogramModes) {
  $correct = 0
  $examples = @()

  foreach ($label in $labels) {
    $truth = $label.correction.restoredName
    if (-not $truth) { $truth = $label.trainingLabel.label.restoredName }
    $box = $label.box
    $key = "$($box.x),$($box.y),$($box.w),$($box.h)"
    if (-not $cropCache.ContainsKey($key)) {
      $cropCache[$key] = [ImageEval]::FromCrop((Resolve-Path $ScreenshotPath), [int]$box.x, [int]$box.y, [int]$box.w, [int]$box.h)
    }
    $crop = $cropCache[$key]

    $bestRef = $null
    $bestScore = -1.0
    foreach ($ref in $refs) {
      $restoredHist = [ImageEval]::HistogramSimilarity($crop, $ref.Restored)
      $damagedHist = if ($ref.Damaged) { [ImageEval]::HistogramSimilarity($crop, $ref.Damaged) } else { 0 }
      $candidateScore = switch ($mode) {
        "hist-restored" { $restoredHist }
        "hist-damaged" { $damagedHist }
        "combo-damaged-hist70-shape30" {
          $damagedScore = if ($ref.Damaged) { [ImageEval]::Compare($crop, $ref.Damaged) } else { $null }
          $damagedHist * 0.7 + $(if ($damagedScore) { $damagedScore.Shape * 0.3 } else { 0 })
        }
        "combo-damaged-hist60-shape40" {
          $damagedScore = if ($ref.Damaged) { [ImageEval]::Compare($crop, $ref.Damaged) } else { $null }
          $damagedHist * 0.6 + $(if ($damagedScore) { $damagedScore.Shape * 0.4 } else { 0 })
        }
        "combo-damaged-hist50-shape50" {
          $damagedScore = if ($ref.Damaged) { [ImageEval]::Compare($crop, $ref.Damaged) } else { $null }
          $damagedHist * 0.5 + $(if ($damagedScore) { $damagedScore.Shape * 0.5 } else { 0 })
        }
        "combo-damaged-hist40-shape60" {
          $damagedScore = if ($ref.Damaged) { [ImageEval]::Compare($crop, $ref.Damaged) } else { $null }
          $damagedHist * 0.4 + $(if ($damagedScore) { $damagedScore.Shape * 0.6 } else { 0 })
        }
        "combo-damaged-hist30-shape70" {
          $damagedScore = if ($ref.Damaged) { [ImageEval]::Compare($crop, $ref.Damaged) } else { $null }
          $damagedHist * 0.3 + $(if ($damagedScore) { $damagedScore.Shape * 0.7 } else { 0 })
        }
        "combo-damaged-hist50-shape30-edge20" {
          $damagedScore = if ($ref.Damaged) { [ImageEval]::Compare($crop, $ref.Damaged) } else { $null }
          $damagedHist * 0.5 + $(if ($damagedScore) { $damagedScore.Shape * 0.3 + $damagedScore.Edge * 0.2 } else { 0 })
        }
        "hist-correlation-damaged" {
          if ($ref.Damaged) { [ImageEval]::HistogramCorrelation($crop, $ref.Damaged) } else { 0 }
        }
        "hist-bhattacharyya-damaged" {
          if ($ref.Damaged) { [ImageEval]::HistogramBhattacharyya($crop, $ref.Damaged) } else { 0 }
        }
        "hist-chialt-damaged" {
          if ($ref.Damaged) { [ImageEval]::HistogramChiAlt($crop, $ref.Damaged) } else { 0 }
        }
        "pixel-ncc-damaged" {
          if ($ref.Damaged) { [ImageEval]::PixelNcc($crop, $ref.Damaged) } else { 0 }
        }
        "combo-bhattacharyya70-shape30" {
          $damagedScore = if ($ref.Damaged) { [ImageEval]::Compare($crop, $ref.Damaged) } else { $null }
          $hist = if ($ref.Damaged) { [ImageEval]::HistogramBhattacharyya($crop, $ref.Damaged) } else { 0 }
          $hist * 0.7 + $(if ($damagedScore) { $damagedScore.Shape * 0.3 } else { 0 })
        }
        "combo-correlation70-shape30" {
          $damagedScore = if ($ref.Damaged) { [ImageEval]::Compare($crop, $ref.Damaged) } else { $null }
          $hist = if ($ref.Damaged) { [ImageEval]::HistogramCorrelation($crop, $ref.Damaged) } else { 0 }
          $hist * 0.7 + $(if ($damagedScore) { $damagedScore.Shape * 0.3 } else { 0 })
        }
        "combo-chialt70-shape30" {
          $damagedScore = if ($ref.Damaged) { [ImageEval]::Compare($crop, $ref.Damaged) } else { $null }
          $hist = if ($ref.Damaged) { [ImageEval]::HistogramChiAlt($crop, $ref.Damaged) } else { 0 }
          $hist * 0.7 + $(if ($damagedScore) { $damagedScore.Shape * 0.3 } else { 0 })
        }
        "combo-chialt60-shape40" {
          $damagedScore = if ($ref.Damaged) { [ImageEval]::Compare($crop, $ref.Damaged) } else { $null }
          $hist = if ($ref.Damaged) { [ImageEval]::HistogramChiAlt($crop, $ref.Damaged) } else { 0 }
          $hist * 0.6 + $(if ($damagedScore) { $damagedScore.Shape * 0.4 } else { 0 })
        }
        "combo-chialt50-shape50" {
          $damagedScore = if ($ref.Damaged) { [ImageEval]::Compare($crop, $ref.Damaged) } else { $null }
          $hist = if ($ref.Damaged) { [ImageEval]::HistogramChiAlt($crop, $ref.Damaged) } else { 0 }
          $hist * 0.5 + $(if ($damagedScore) { $damagedScore.Shape * 0.5 } else { 0 })
        }
        "combo-chialt40-shape60" {
          $damagedScore = if ($ref.Damaged) { [ImageEval]::Compare($crop, $ref.Damaged) } else { $null }
          $hist = if ($ref.Damaged) { [ImageEval]::HistogramChiAlt($crop, $ref.Damaged) } else { 0 }
          $hist * 0.4 + $(if ($damagedScore) { $damagedScore.Shape * 0.6 } else { 0 })
        }
        "combo-chialt30-shape70" {
          $damagedScore = if ($ref.Damaged) { [ImageEval]::Compare($crop, $ref.Damaged) } else { $null }
          $hist = if ($ref.Damaged) { [ImageEval]::HistogramChiAlt($crop, $ref.Damaged) } else { 0 }
          $hist * 0.3 + $(if ($damagedScore) { $damagedScore.Shape * 0.7 } else { 0 })
        }
        default { [Math]::Max($restoredHist, $damagedHist) }
      }
      if ($candidateScore -gt $bestScore) {
        $bestScore = $candidateScore
        $bestRef = $ref
      }
    }

    $prediction = $bestRef.RestoredName
    $isCorrect = [string]::Equals($prediction, $truth, [System.StringComparison]::OrdinalIgnoreCase)
    if ($isCorrect) { $correct++ }
    if ($examples.Count -lt 8 -and -not $isCorrect) {
      $examples += [pscustomobject]@{
        BankIndex = $label.bankIndex
        Truth = $truth
        Predicted = $prediction
        Score = [Math]::Round([double]$bestScore, 4)
      }
    }
  }

  $accuracy = $correct / [double]$labels.Count
  $results += [pscustomobject]@{
    Iteration = $mode
    Correct = $correct
    Total = $labels.Count
    Accuracy = [Math]::Round($accuracy * 100, 2)
    ExampleFailures = $examples
  }
}

$top = $results | Sort-Object -Property @{ Expression = "Correct"; Descending = $true }, @{ Expression = "Accuracy"; Descending = $true } | Select-Object -First 20

$focusedRanks = @()
if ($OnlyRestoredNames.Count -gt 0) {
  foreach ($label in $labels) {
    $truth = $label.correction.restoredName
    if (-not $truth) { $truth = $label.trainingLabel.label.restoredName }
    $box = $label.box
    $key = "$($box.x),$($box.y),$($box.w),$($box.h)"
    if (-not $cropCache.ContainsKey($key)) {
      $cropCache[$key] = [ImageEval]::FromCrop((Resolve-Path $ScreenshotPath), [int]$box.x, [int]$box.y, [int]$box.w, [int]$box.h)
    }
    $crop = $cropCache[$key]

    $ranked = @()
    foreach ($ref in $refs) {
      $damagedScore = if ($ref.Damaged) { [ImageEval]::Compare($crop, $ref.Damaged) } else { $null }
      $hist = if ($ref.Damaged) { [ImageEval]::HistogramChiAlt($crop, $ref.Damaged) } else { 0 }
      $score = $hist * 0.6 + $(if ($damagedScore) { $damagedScore.Shape * 0.4 } else { 0 })
      $ranked += [pscustomobject]@{
        RestoredName = $ref.RestoredName
        Score = [Math]::Round([double]$score, 4)
        Shape = if ($damagedScore) { [Math]::Round([double]$damagedScore.Shape, 4) } else { 0 }
        Overlap = if ($damagedScore) { [Math]::Round([double]$damagedScore.Overlap, 4) } else { 0 }
        Histogram = [Math]::Round([double]$hist, 4)
      }
    }

    $sorted = @($ranked | Sort-Object -Property @{ Expression = "Score"; Descending = $true })
    $truthRank = -1
    for ($i = 0; $i -lt $sorted.Count; $i++) {
      if ([string]::Equals($sorted[$i].RestoredName, $truth, [System.StringComparison]::OrdinalIgnoreCase)) {
        $truthRank = $i + 1
        break
      }
    }

    $focusedRanks += [pscustomobject]@{
      BankIndex = $label.bankIndex
      Truth = $truth
      TruthRank = $truthRank
      Top10 = $sorted | Select-Object -First 10
      TruthScore = if ($truthRank -gt 0) { $sorted[$truthRank - 1] } else { $null }
    }
  }
}

[pscustomobject]@{
  LabelCount = $labels.Count
  IterationCount = $configs.Count
  Top = $top
  AllBaseline = $results | Select-Object -First 12
  FocusedLiveRanks = $focusedRanks
} | ConvertTo-Json -Depth 8
