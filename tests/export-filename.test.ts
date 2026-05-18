import assert from "node:assert/strict";
import test from "node:test";

import { createAnalysisExportFilename } from "../src/application/export-analysis/export-filename";

test("createAnalysisExportFilename replaces timestamp separators", () => {
  assert.equal(
    createAnalysisExportFilename("2026-05-18T12:34:56.789Z"),
    "rs3-archaeology-analysis-2026-05-18T12-34-56-789Z.json"
  );
});
