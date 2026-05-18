import assert from "node:assert/strict";
import test from "node:test";

import { createResultsState } from "../src/presentation/state/results-state";

test("createResultsState stores detections by recognition mode", () => {
  const state = createResultsState<{ id: number }>();
  const damaged = [{ id: 1 }];
  const restored = [{ id: 2 }];

  assert.deepEqual(state.setDetectionsForMode("damaged", damaged), damaged);
  assert.deepEqual(state.setDetectionsForMode("restored", restored), restored);
  assert.deepEqual(state.detectionsForMode("damaged"), damaged);
  assert.deepEqual(state.detectionsForMode("restored"), restored);
});

test("createResultsState maps tabs to active detection modes", () => {
  const state = createResultsState<{ id: number }>();
  const damaged = [{ id: 1 }];
  const restored = [{ id: 2 }];
  state.setDetectionsForMode("damaged", damaged);
  state.setDetectionsForMode("restored", restored);

  assert.equal(state.activeTab, "damaged");
  assert.equal(state.activeMode, "damaged");
  assert.deepEqual(state.setActiveTab("restored"), restored);
  assert.equal(state.activeMode, "restored");
  assert.deepEqual(state.activeDetections(), restored);
  assert.deepEqual(state.setActiveTab("materials"), damaged);
  assert.equal(state.activeMode, "damaged");
});

test("createResultsState removes a detection from one recognition mode", () => {
  const state = createResultsState<{ id: number }>();
  const first = { id: 1 };
  const second = { id: 2 };
  const restored = { id: 3 };
  state.setDetectionsForMode("damaged", [first, second]);
  state.setDetectionsForMode("restored", [restored]);

  assert.deepEqual(state.removeDetectionForMode("damaged", first), [second]);
  assert.deepEqual(state.detectionsForMode("damaged"), [second]);
  assert.deepEqual(state.detectionsForMode("restored"), [restored]);

  state.setActiveTab("restored");
  assert.deepEqual(state.removeDetectionForMode("restored", restored), []);
  assert.deepEqual(state.detectionsForMode("restored"), []);
  assert.deepEqual(state.detectionsForMode("damaged"), [second]);
});

test("createResultsState requests separate screenshots only once for relevant tabs", () => {
  const state = createResultsState();

  assert.equal(state.shouldRequestScreenshot("damaged"), false);
  assert.equal(state.shouldRequestScreenshot("overview"), false);
  assert.equal(state.shouldRequestScreenshot("restored"), true);
  assert.equal(state.shouldRequestScreenshot("restored"), false);
  assert.equal(state.shouldRequestScreenshot("storage"), true);
  assert.equal(state.shouldRequestScreenshot("storage"), false);
  assert.equal(state.shouldRequestScreenshot("materials"), false);
});
