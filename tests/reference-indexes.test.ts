import assert from "node:assert/strict";
import test from "node:test";

import {
  createArchaeologyReferenceIndexes,
  emptyArchaeologyReferenceIndexes
} from "../src/application/load-references/archaeology-reference-indexes";

test("createArchaeologyReferenceIndexes normalizes recipe and material lookup keys", () => {
  const indexes = createArchaeologyReferenceIndexes({
    materials: [{ name: "Third Age Iron" }, { name: "Zarosian insignia" }],
    otherItems: [{ name: "Death rune", icon: "other-item-icons/death-rune.png" }],
    artefactRecipes: [
      { restoredName: "Restored Vase", materials: [{ name: "Third Age Iron", quantity: 8 }] },
      { restoredName: "Restored token" }
    ],
    collections: []
  });

  assert.equal(indexes.recipeByRestoredName.get("restored vase")?.restoredName, "Restored Vase");
  assert.equal(indexes.materialByName.get("third age iron")?.name, "Third Age Iron");
  assert.equal(indexes.materialByName.get("death rune")?.icon, "other-item-icons/death-rune.png");
});

test("emptyArchaeologyReferenceIndexes returns empty lookup maps", () => {
  const indexes = emptyArchaeologyReferenceIndexes();
  assert.equal(indexes.recipeByRestoredName.size, 0);
  assert.equal(indexes.materialByName.size, 0);
});
