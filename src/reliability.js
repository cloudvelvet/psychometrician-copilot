import { normalizeResponses, scoreItem, validateScale } from "./score.js";
import { resolveScorableItemIds, resolveSubscaleItemIds } from "./subscales.js";

export function cronbachAlpha(matrix) {
  const rows = matrix
    .map((row) => row.map((value) => Number(value)))
    .filter((row) => row.every(Number.isFinite));

  if (rows.length < 2 || rows[0]?.length < 2) {
    return null;
  }

  const itemCount = rows[0].length;
  if (!rows.every((row) => row.length === itemCount)) {
    throw new Error("All rows must have the same number of items.");
  }

  const itemVariances = [];
  for (let column = 0; column < itemCount; column += 1) {
    itemVariances.push(sampleVariance(rows.map((row) => row[column])));
  }

  const totalScores = rows.map((row) => row.reduce((total, value) => total + value, 0));
  const totalVariance = sampleVariance(totalScores);
  if (totalVariance === 0) {
    return null;
  }

  const alpha = (itemCount / (itemCount - 1)) *
    (1 - itemVariances.reduce((total, value) => total + value, 0) / totalVariance);

  return Number(alpha.toFixed(4));
}

export function cronbachAlphaForScale(scale, respondentResponses, options = {}) {
  validateScale(scale);

  const targetItemIds = options.subscaleId
    ? resolveSubscaleItemIds(scale, options.subscaleId)
    : resolveScorableItemIds(scale);

  if (!Array.isArray(targetItemIds) || targetItemIds.length < 2) {
    return {
      alpha: null,
      respondentCount: 0,
      itemCount: targetItemIds?.length ?? 0,
      reason: "not_enough_items"
    };
  }

  const itemById = new Map(scale.items.map((item) => [item.id, item]));
  const rows = [];

  for (const responses of respondentResponses) {
    const responseMap = normalizeResponses(responses);
    const row = [];
    let complete = true;

    for (const itemId of targetItemIds) {
      const item = itemById.get(itemId);
      const scored = scoreItem(item, responseMap.get(itemId), scale.responseScale);
      if (scored.missing) {
        complete = false;
        break;
      }
      row.push(scored.scored);
    }

    if (complete) {
      rows.push(row);
    }
  }

  const alpha = cronbachAlpha(rows);

  return {
    alpha,
    respondentCount: rows.length,
    itemCount: targetItemIds.length,
    reason: rows.length < 2
      ? "not_enough_complete_respondents"
      : alpha === null ? "undefined_alpha" : null
  };
}

function sampleVariance(values) {
  if (values.length < 2) {
    return 0;
  }

  const avg = values.reduce((total, value) => total + value, 0) / values.length;
  return values.reduce((total, value) => total + (value - avg) ** 2, 0) / (values.length - 1);
}
