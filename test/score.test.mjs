import assert from "node:assert/strict";
import test from "node:test";
import { scoreAssessment, scoreItem } from "../src/index.js";

const fixtureScale = {
  id: "fixture",
  name: "Fixture",
  responseScale: { min: 1, max: 5 },
  items: [
    { id: "a", factor: "trait", reverse: false },
    { id: "b", factor: "trait", reverse: true },
    { id: "c", factor: "other", reverse: false },
    {
      id: "att",
      factor: "validity",
      excludeFromScoring: true,
      attentionCheck: { expected: 3 }
    }
  ],
  subscales: {
    trait: { method: "mean", items: ["a", "b"] },
    other: { method: "sum", items: ["c"], minAnsweredRatio: 1 }
  },
  consistencyPairs: [
    { id: "trait_pair", leftItemId: "a", rightItemId: "b", maxDifference: 1 }
  ]
};

test("scoreItem applies reverse scoring with min + max - raw", () => {
  const result = scoreItem({ id: "x", reverse: true }, 2, { min: 1, max: 5 });
  assert.equal(result.scored, 4);
});

test("scoreItem uses item-level response bounds when present", () => {
  const result = scoreItem(
    { id: "x", reverse: true, responseScale: { min: 0, max: 10 } },
    2,
    { min: 1, max: 5 }
  );

  assert.equal(result.scored, 8);
  assert.deepEqual(result.responseScale, { min: 0, max: 10 });
});

test("scoreAssessment scores subscales and excludes attention checks from overall", () => {
  const result = scoreAssessment(fixtureScale, { a: 5, b: 1, c: 4, att: 3 });

  assert.equal(result.scoring.subscales.trait.score, 5);
  assert.equal(result.scoring.subscales.trait.mean, 5);
  assert.equal(result.scoring.subscales.trait.sum, 10);
  assert.equal(result.scoring.subscales.other.score, 4);
  assert.equal(result.scoring.overall.score, 4.667);
  assert.equal(result.validity.flag, "usable");
});

test("scoreAssessment includes a sanitized AI projection", () => {
  const result = scoreAssessment(fixtureScale, { a: 5, b: 1, c: 4, att: 3 });

  assert.equal(result.interpretationInput.schemaVersion, "ai_projection_v1");
  assert.equal(result.interpretationInput.nonDiagnostic, true);
  assert.equal(result.interpretationInput.scale.id, "fixture");
  assert.equal(result.interpretationInput.scores.subscales[0].raw, undefined);
  assert.equal(Object.isFrozen(result.interpretationInput), true);
});

test("scoreAssessment returns null for incomplete subscales below minAnsweredRatio", () => {
  const result = scoreAssessment(fixtureScale, { a: 5, att: 3 });

  assert.equal(result.scoring.subscales.trait.score, null);
  assert.equal(result.scoring.subscales.trait.complete, false);
  assert.deepEqual(result.interpretationInput.scores.incompleteSubscales, ["trait", "other"]);
});

test("scoreAssessment rejects out-of-range values", () => {
  assert.throws(
    () => scoreAssessment(fixtureScale, { a: 6, b: 1, c: 4, att: 3 }),
    /outside the response scale/
  );
});
