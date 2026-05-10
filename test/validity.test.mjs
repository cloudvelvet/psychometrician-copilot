import assert from "node:assert/strict";
import test from "node:test";
import { calculateLongString, calculateVariance, scoreAssessment } from "../src/index.js";

const validityScale = {
  id: "validity",
  name: "Validity Fixture",
  responseScale: { min: 1, max: 5 },
  items: [
    { id: "i1", factor: "x", reverse: false },
    { id: "i2", factor: "x", reverse: false },
    { id: "i3", factor: "x", reverse: false },
    { id: "i4", factor: "x", reverse: false },
    { id: "i5", factor: "x", reverse: false },
    { id: "i6", factor: "x", reverse: false },
    { id: "p1", factor: "pair", reverse: false },
    { id: "p2", factor: "pair", reverse: true },
    {
      id: "att",
      factor: "validity",
      excludeFromScoring: true,
      attentionCheck: { expected: 2 }
    }
  ],
  subscales: {
    x: { method: "mean", items: ["i1", "i2", "i3", "i4", "i5", "i6"] },
    pair: { method: "mean", items: ["p1", "p2"] }
  },
  consistencyPairs: [
    { id: "pair_check", leftItemId: "p1", rightItemId: "p2", maxDifference: 1 }
  ]
};

test("calculateLongString returns the longest repeated run", () => {
  assert.equal(calculateLongString([1, 1, 2, 2, 2, 3]), 3);
});

test("calculateVariance returns population variance", () => {
  assert.equal(calculateVariance([1, 2, 3]), 0.6666666666666666);
});

test("validity catches failed attention checks and consistency pairs", () => {
  const result = scoreAssessment(validityScale, {
    i1: 1,
    i2: 2,
    i3: 3,
    i4: 4,
    i5: 5,
    i6: 4,
    p1: 5,
    p2: 5,
    att: 4
  });

  assert.equal(result.validity.flag, "invalid");
  assert.deepEqual(result.validity.attentionChecks.failed, ["att"]);
  assert.deepEqual(result.validity.consistency.failedPairs, ["pair_check"]);
});

test("validity flags long-string and low variance response patterns", () => {
  const result = scoreAssessment(validityScale, {
    i1: 3,
    i2: 3,
    i3: 3,
    i4: 3,
    i5: 3,
    i6: 3,
    p1: 3,
    p2: 3,
    att: 2
  }, {
    validity: {
      thresholds: {
        longStringCaution: 4,
        longStringInvalid: 7
      }
    }
  });

  assert.equal(result.validity.flag, "invalid");
  assert.equal(result.validity.metrics.longStringMax, 8);
  assert.equal(result.validity.metrics.responseVariance, 0);
  assert.ok(result.validity.checks.some((check) => (
    check.id === "long_string" &&
    check.severity === "error" &&
    check.source === "generic"
  )));
});

test("validity flags high missing rates", () => {
  const result = scoreAssessment(validityScale, {
    i1: 4,
    i2: 4,
    att: 2
  });

  assert.equal(result.validity.flag, "invalid");
  assert.ok(result.validity.metrics.missingRate > 0.25);
});
