const DEFAULT_THRESHOLDS = {
  missingRateCaution: 0.1,
  missingRateInvalid: 0.25,
  longStringCaution: 8,
  longStringInvalid: 12,
  lowVarianceCaution: 0.15,
  lowVarianceInvalid: 0.05,
  extremeRateCaution: 0.8,
  extremeRateInvalid: 0.95,
  consistencyRateCaution: 0.3,
  consistencyRateInvalid: 0.5
};

export function evaluateValidity(scale, responseMap, itemScores, options = {}) {
  const thresholds = {
    ...DEFAULT_THRESHOLDS,
    ...(scale.validity?.thresholds ?? {}),
    ...(options.thresholds ?? {})
  };
  const items = scale.items ?? [];
  const answeredScores = items
    .map((item) => itemScores[item.id])
    .filter((score) => score && !score.missing);
  const answeredRaw = answeredScores.map((score) => score.raw);
  const scorableItems = items.filter((item) => !item.excludeFromScoring);
  const scorableAnswered = scorableItems
    .map((item) => itemScores[item.id])
    .filter((score) => score && !score.missing);
  const scorableRaw = scorableAnswered.map((score) => score.raw);

  const missingRate = items.length === 0
    ? 0
    : round(items.filter((item) => itemScores[item.id]?.missing).length / items.length);

  const responseVariance = scorableRaw.length > 1 ? round(calculateVariance(scorableRaw)) : null;
  const longStringMax = calculateLongString(scorableRaw);
  const extremeResponseRate = scorableAnswered.length === 0
    ? null
    : round(scorableAnswered.filter((score) => (
      score.raw === score.responseScale.min || score.raw === score.responseScale.max
    )).length / scorableAnswered.length);

  const attentionChecks = evaluateAttentionChecks(items, responseMap);
  const consistency = evaluateConsistencyPairs(scale.consistencyPairs ?? [], itemScores);
  const checks = [];
  const warnings = [];
  let flag = "usable";

  const addCheck = ({ id, severity, source = "generic", blocking, message, observed, threshold }) => {
    checks.push({
      id,
      severity,
      source,
      blocking: blocking ?? severity === "error",
      message,
      observed,
      threshold
    });
    if (severity === "info") {
      return;
    }
    warnings.push(message);
    if (severity === "error") {
      flag = "invalid";
    } else if (severity === "flag" && flag === "usable") {
      flag = "caution";
    }
  };

  if (missingRate > thresholds.missingRateInvalid) {
    addCheck({
      id: "missing_rate",
      severity: "error",
      message: `Missing response rate is high (${missingRate}).`,
      observed: missingRate,
      threshold: thresholds.missingRateInvalid
    });
  } else if (missingRate > thresholds.missingRateCaution) {
    addCheck({
      id: "missing_rate",
      severity: "flag",
      message: `Missing response rate needs review (${missingRate}).`,
      observed: missingRate,
      threshold: thresholds.missingRateCaution
    });
  }

  if (longStringMax >= thresholds.longStringInvalid) {
    addCheck({
      id: "long_string",
      severity: "error",
      message: `Long-string response pattern is very high (${longStringMax}).`,
      observed: longStringMax,
      threshold: thresholds.longStringInvalid
    });
  } else if (longStringMax >= thresholds.longStringCaution) {
    addCheck({
      id: "long_string",
      severity: "flag",
      message: `Long-string response pattern needs review (${longStringMax}).`,
      observed: longStringMax,
      threshold: thresholds.longStringCaution
    });
  }

  if (responseVariance !== null && scorableRaw.length >= 6) {
    if (responseVariance < thresholds.lowVarianceInvalid) {
      addCheck({
        id: "response_variance",
        severity: "error",
        message: `Response variance is extremely low (${responseVariance}).`,
        observed: responseVariance,
        threshold: thresholds.lowVarianceInvalid
      });
    } else if (responseVariance < thresholds.lowVarianceCaution) {
      addCheck({
        id: "response_variance",
        severity: "flag",
        message: `Response variance is low (${responseVariance}).`,
        observed: responseVariance,
        threshold: thresholds.lowVarianceCaution
      });
    }
  }

  if (extremeResponseRate !== null) {
    if (extremeResponseRate > thresholds.extremeRateInvalid) {
      addCheck({
        id: "extreme_response_rate",
        severity: "error",
        message: `Extreme response rate is very high (${extremeResponseRate}).`,
        observed: extremeResponseRate,
        threshold: thresholds.extremeRateInvalid
      });
    } else if (extremeResponseRate > thresholds.extremeRateCaution) {
      addCheck({
        id: "extreme_response_rate",
        severity: "flag",
        message: `Extreme response rate needs review (${extremeResponseRate}).`,
        observed: extremeResponseRate,
        threshold: thresholds.extremeRateCaution
      });
    }
  }

  if (attentionChecks.failed.length > 0) {
    addCheck({
      id: "attention_check",
      severity: "error",
      source: "scale",
      message: `Attention check failed: ${attentionChecks.failed.join(", ")}.`,
      observed: attentionChecks.failed.length,
      threshold: 0
    });
  }

  if (consistency.evaluablePairs > 0) {
    if (consistency.inconsistencyRate > thresholds.consistencyRateInvalid) {
      addCheck({
        id: "consistency_pairs",
        severity: "error",
        source: "scale",
        message: `Consistency-pair inconsistency is high (${consistency.inconsistencyRate}).`,
        observed: consistency.inconsistencyRate,
        threshold: thresholds.consistencyRateInvalid
      });
    } else if (consistency.inconsistencyRate > thresholds.consistencyRateCaution) {
      addCheck({
        id: "consistency_pairs",
        severity: "flag",
        source: "scale",
        message: `Consistency-pair inconsistency needs review (${consistency.inconsistencyRate}).`,
        observed: consistency.inconsistencyRate,
        threshold: thresholds.consistencyRateCaution
      });
    }
  }

  return {
    flag,
    warnings,
    checks,
    metrics: {
      missingRate,
      answeredItems: answeredScores.length,
      longStringMax,
      responseVariance,
      extremeResponseRate
    },
    attentionChecks,
    consistency
  };
}

export function calculateLongString(values) {
  let longest = 0;
  let current = 0;
  let previous = Symbol("none");

  for (const value of values) {
    if (value === previous) {
      current += 1;
    } else {
      current = 1;
      previous = value;
    }
    longest = Math.max(longest, current);
  }

  return longest;
}

export function calculateVariance(values) {
  if (values.length === 0) {
    return null;
  }

  const avg = values.reduce((total, value) => total + value, 0) / values.length;
  return values.reduce((total, value) => total + (value - avg) ** 2, 0) / values.length;
}

function evaluateAttentionChecks(items, responseMap) {
  const checks = items.filter((item) => item.attentionCheck);
  const passed = [];
  const failed = [];
  const missing = [];

  for (const item of checks) {
    const expected = Number(item.attentionCheck.expected);
    const actual = responseMap.get(item.id);

    if (actual === undefined || actual === null || actual === "") {
      missing.push(item.id);
    } else if (Number(actual) === expected) {
      passed.push(item.id);
    } else {
      failed.push(item.id);
    }
  }

  return {
    total: checks.length,
    passed,
    failed,
    missing
  };
}

function evaluateConsistencyPairs(pairs, itemScores) {
  const details = [];

  for (const pair of pairs) {
    const left = itemScores[pair.leftItemId];
    const right = itemScores[pair.rightItemId];

    if (!left || !right || left.missing || right.missing) {
      details.push({
        id: pair.id ?? `${pair.leftItemId}:${pair.rightItemId}`,
        evaluable: false,
        reason: "missing"
      });
      continue;
    }

    const diff = Math.abs(left.scored - right.scored);
    const maxDifference = pair.maxDifference ?? 2;
    details.push({
      id: pair.id ?? `${pair.leftItemId}:${pair.rightItemId}`,
      evaluable: true,
      leftItemId: pair.leftItemId,
      rightItemId: pair.rightItemId,
      difference: round(diff),
      maxDifference,
      passed: diff <= maxDifference
    });
  }

  const evaluable = details.filter((detail) => detail.evaluable);
  const failed = evaluable.filter((detail) => !detail.passed);

  return {
    evaluablePairs: evaluable.length,
    failedPairs: failed.map((detail) => detail.id),
    inconsistencyRate: evaluable.length === 0 ? 0 : round(failed.length / evaluable.length),
    details
  };
}

function round(value, digits = 3) {
  return Number(value.toFixed(digits));
}
