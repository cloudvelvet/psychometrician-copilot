import assert from "node:assert/strict";
import test from "node:test";
import { cronbachAlpha, cronbachAlphaForScale } from "../src/index.js";

test("cronbachAlpha calculates alpha for complete response matrices", () => {
  const alpha = cronbachAlpha([
    [1, 2, 1],
    [2, 3, 2],
    [3, 4, 3],
    [4, 5, 4]
  ]);

  assert.equal(alpha, 1);
});

test("cronbachAlpha returns null when there is not enough data", () => {
  assert.equal(cronbachAlpha([[1, 2, 3]]), null);
  assert.equal(cronbachAlpha([[1], [2], [3]]), null);
});

test("cronbachAlphaForScale scores reverse items before reliability calculation", () => {
  const scale = {
    id: "alpha_fixture",
    name: "Alpha Fixture",
    responseScale: { min: 1, max: 5 },
    items: [
      { id: "x1", factor: "x", reverse: false },
      { id: "x2", factor: "x", reverse: true }
    ],
    subscales: {
      x: { method: "mean", items: ["x1", "x2"] }
    }
  };

  const result = cronbachAlphaForScale(scale, [
    { x1: 1, x2: 5 },
    { x1: 2, x2: 4 },
    { x1: 3, x2: 3 },
    { x1: 4, x2: 2 }
  ], { subscaleId: "x" });

  assert.equal(result.alpha, 1);
  assert.equal(result.respondentCount, 4);
  assert.equal(result.itemCount, 2);
});

test("cronbachAlphaForScale resolves subscale items from factor metadata when items are implicit", () => {
  const scale = {
    id: "implicit_subscale_fixture",
    name: "Implicit Subscale Fixture",
    responseScale: { min: 1, max: 5 },
    items: [
      { id: "x1", factor: "x", reverse: false },
      { id: "x2", factor: "x", reverse: true },
      { id: "att", factor: "validity", reverse: false, excludeFromScoring: true }
    ],
    subscales: {
      x: { method: "mean" }
    }
  };

  const result = cronbachAlphaForScale(scale, [
    { x1: 1, x2: 5, att: 3 },
    { x1: 2, x2: 4, att: 3 },
    { x1: 3, x2: 3, att: 3 },
    { x1: 4, x2: 2, att: 3 }
  ], { subscaleId: "x" });

  assert.equal(result.alpha, 1);
  assert.equal(result.itemCount, 2);
});
