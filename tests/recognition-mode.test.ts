import assert from "node:assert/strict";
import test from "node:test";

import { recognitionModeForTab } from "../src/application/analyze-screenshot/recognition-mode";

test("recognitionModeForTab uses restored mode only for the restored tab", () => {
  assert.equal(recognitionModeForTab("restored"), "restored");
  assert.equal(recognitionModeForTab("damaged"), "damaged");
  assert.equal(recognitionModeForTab("overview"), "damaged");
});
