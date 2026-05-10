const REPORT_BOUNDARIES = [
  "Do not diagnose medical or psychiatric conditions.",
  "Do not change or invent scores.",
  "Describe response patterns as tendencies, not fixed traits.",
  "Escalate crisis or self-harm language through a separate safety workflow."
];

export function projectForAI(assessmentResult, scale, options = {}) {
  const subscales = assessmentResult.scoring?.subscales ?? {};
  const scoredSubscales = Object.entries(subscales)
    .filter(([, result]) => result.score !== null)
    .map(([id, result]) => ({
      id,
      label: result.label,
      score: result.score,
      mean: result.mean,
      sum: result.sum,
      method: result.method,
      itemCount: result.itemCount,
      answeredItems: result.answeredItems
    }));

  const sorted = [...scoredSubscales].sort((a, b) => b.score - a.score);
  const incomplete = Object.entries(subscales)
    .filter(([, result]) => !result.complete)
    .map(([id]) => id);

  const dto = {
    schemaVersion: "ai_projection_v1",
    nonDiagnostic: true,
    immutable: true,
    scale: {
      id: assessmentResult.scaleId,
      name: assessmentResult.scaleName,
      version: assessmentResult.scaleVersion,
      measurementStatus: scale.measurementStatus ?? "unspecified",
      notice: scale.notice ?? null
    },
    validity: {
      flag: assessmentResult.validity.flag,
      warnings: [...assessmentResult.validity.warnings],
      checks: assessmentResult.validity.checks
        .filter((check) => check.severity !== "info")
        .map((check) => ({
          id: check.id,
          severity: check.severity,
          source: check.source,
          blocking: check.blocking,
          message: check.message
        }))
    },
    scores: {
      subscales: scoredSubscales,
      highest: sorted.slice(0, options.topN ?? 2),
      lowest: sorted.slice(-(options.bottomN ?? 2)).reverse(),
      incompleteSubscales: incomplete,
      overall: assessmentResult.scoring.overall
    },
    reportBoundaries: REPORT_BOUNDARIES
  };

  return deepFreeze(dto);
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) {
    return value;
  }

  Object.freeze(value);
  for (const child of Object.values(value)) {
    deepFreeze(child);
  }
  return value;
}
