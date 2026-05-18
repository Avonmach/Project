import type { DetectionMode, ResultsTab } from "../tabs/results-tabs";
import { resultModeForTab } from "../tabs/results-tabs";

export interface ResultsState<TDetection> {
  activeTab: ResultsTab;
  activeMode: DetectionMode;
  activeDetections(): TDetection[];
  detectionsForMode(mode: DetectionMode): TDetection[];
  setActiveTab(tab: ResultsTab): TDetection[];
  setDetectionsForMode(mode: DetectionMode, detections: TDetection[]): TDetection[];
  removeDetectionForMode(mode: DetectionMode, detection: TDetection): TDetection[];
  shouldRequestScreenshot(tab: ResultsTab): boolean;
}

export function createResultsState<TDetection>(): ResultsState<TDetection> {
  let activeTab: ResultsTab = "damaged";
  const detectionsByMode: Record<DetectionMode, TDetection[]> = {
    damaged: [],
    restored: []
  };
  const screenshotRequestedTabs = new Set<ResultsTab>();

  return {
    get activeTab() {
      return activeTab;
    },
    get activeMode() {
      return resultModeForTab(activeTab);
    },
    activeDetections() {
      return detectionsByMode[resultModeForTab(activeTab)];
    },
    detectionsForMode(mode) {
      return detectionsByMode[mode];
    },
    setActiveTab(tab) {
      activeTab = tab;
      return detectionsByMode[resultModeForTab(tab)];
    },
    setDetectionsForMode(mode, detections) {
      detectionsByMode[mode] = detections;
      return detections;
    },
    removeDetectionForMode(mode, detection) {
      detectionsByMode[mode] = detectionsByMode[mode].filter((item) => item !== detection);
      return detectionsByMode[resultModeForTab(activeTab)];
    },
    shouldRequestScreenshot(tab) {
      if (!["restored", "materials"].includes(tab) || screenshotRequestedTabs.has(tab)) return false;
      screenshotRequestedTabs.add(tab);
      return true;
    }
  };
}
