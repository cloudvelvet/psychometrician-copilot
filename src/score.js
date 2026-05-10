import { projectForAI } from "./ai-projection.js";
import { resolveSubscaleItemIds } from "./subscales.js";
import { evaluateValidity } from "./validity.js";

const DEFAULT_MIN_ANSWERED_RATIO = 0.8;

export function normalizeResponses(responses) {
  if (responses instanceof Map) {
    return new Map(responses);
  }

  if (Array.isArray(responses)) {
    return new Map(responses.map((entry) => [entry.itemId, entry.value]));
  }

  if (responses && typeof responses === "object") {
    return new Map(Object.entries(responses));
  }

  throw new TypeError("Responses must be an object, array, or Map.");
}

export function validateScale(scale) {
  if (!scale || typeof scale !== "object") {
    throw new TypeError("Scale must be an object.");
  }

  const { responseScale, items } = scale;
  if (!responseScale || !Number.isFinite(responseScale.min) || !Number.isFinite(responseScale.max)) {
    throw new Error("Scale responseScale.min and responseScale.max are required numbers.");
  }

  if (responseScale.min >= responseScale.max) {
    throw new Error("responseScale.min must be lower than responseScale.max.");
  }

  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("Scale must include at least one item.");
  }

  const ids = new Set();
  for (const item of items) {
    if (!item.id) {
      throw new Error("Every item must include an id.");
    }
    if (ids.has(item.id)) {
      throw new Error(`Duplicate item id: ${item.id}`);
    }
    ids.add(item.id);

    const itemScale = getItemResponseScale(item, responseScale);
    if (!Number.isFinite(itemScale.min) || !Number.isFinite(itemScale.max)) {
      throw new Error(`Item ${item.id} has invalid response bounds.`);
    }
    if (itemScale.min >= itemScale.max) {
      throw new Error(`Item ${item.id} responseScale.min must be lower than responseScale.max.`);
    }

    if (item.attentionCheck) {
      const expected = item.attentionCheck.expected;
      if (!Number.isFinite(expected) || expected < itemScale.min || expected > itemScale.max) {
        throw new Error(`Attention check ${item.id} has an out-of-range expected value.`);
      }
    }
  }

  const subscales = scale.subscales ?? {};
  for (const [subscaleId, subscale] of Object.entries(subscales)) {
    const refs = resolveSubscaleItemIds(scale, subscaleId);
    if (!Array.isArray(refs) || refs.length === 0) {
      throw new Error(`Subscale ${subscaleId} must reference at least one item.`);
    }
    for (const itemId of refs) {
      if (!ids.has(itemId)) {
        throw new Error(`Subscale ${subscaleId} references unknown item ${itemId}.`);
      }
    }
  }

  for (const pair of scale.consistencyPairs ?? []) {
    if (!ids.has(pair.leftItemId) || !ids.has(pair.rightItemId)) {
      throw new Error(`Consistency pair ${pair.id ?? "(unnamed)"} references an unknown item.`);
    }
  }

  return true;
}

export function scoreItem(item, rawValue, responseScale) {
  const itemScale = getItemResponseScale(item, responseScale);

  if (rawValue === undefined || rawValue === null || rawValue === "") {
    return {
      itemId: item.id,
      raw: null,
      scored: null,
      missing: true,
      reverse: Boolean(item.reverse),
      excluded: Boolean(item.excludeFromScoring)
    };
  }

  const raw = Number(rawValue);
  if (!Number.isFinite(raw) || raw < itemScale.min || raw > itemScale.max) {
    throw new Error(`Response for ${item.id} is outside the response scale.`);
  }

  return {
    itemId: item.id,
    raw,
    scored: item.reverse ? itemScale.min + itemScale.max - raw : raw,
    missing: false,
    reverse: Boolean(item.reverse),
    excluded: Boolean(item.excludeFromScoring),
    responseScale: itemScale
  };
}

export function getItemResponseScale(item, scaleResponseScale) {
  return item.responseScale
    ? { min: item.responseScale.min, max: item.responseScale.max }
    : { min: scaleResponseScale.min, max: scaleResponseScale.max };
}

export function scoreAssessment(scale, responses, options = {}) {
  validateScale(scale);

  const responseMap = normalizeResponses(responses);
  const itemById = new Map(scale.items.map((item) => [item.id, item]));
  const itemScores = {};

  for (const item of scale.items) {
    itemScores[item.id] = scoreItem(item, responseMap.get(item.id), scale.responseScale);
  }

  const subscales = {};
  for (const [subscaleId, subscale] of Object.entries(scale.subscales ?? {})) {
    subscales[subscaleId] = scoreSubscale({
      subscaleId,
      subscale,
      itemIds: resolveSubscaleItemIds(scale, subscaleId),
      itemById,
      itemScores,
      defaultMinAnsweredRatio: options.defaultMinAnsweredRatio ?? DEFAULT_MIN_ANSWERED_RATIO
    });
  }

  const scoredItems = Object.values(itemScores).filter((score) => !score.excluded && !score.missing);
  const overallMean = scoredItems.length > 0
    ? round(mean(scoredItems.map((score) => score.scored)))
    : null;

  const validity = evaluateValidity(scale, responseMap, itemScores, options.validity);

  const result = {
    scaleId: scale.id,
    scaleName: scale.name,
    scaleVersion: scale.version ?? null,
    scoring: {
      responseScale: scale.responseScale,
      items: itemScores,
      subscales,
      overall: {
        method: "mean",
        score: overallMean,
        answeredItems: scoredItems.length
      }
    },
    validity,
    interpretationInput: null
  };

  result.interpretationInput = projectForAI(result, scale);
  return result;
}

function scoreSubscale({
  subscaleId,
  subscale,
  itemIds,
  itemById,
  itemScores,
  defaultMinAnsweredRatio
}) {
  const method = subscale.method ?? "mean";
  if (!["mean", "sum"].includes(method)) {
    throw new Error(`Unsupported scoring method for ${subscaleId}: ${method}`);
  }

  const eligibleIds = itemIds.filter((itemId) => !itemById.get(itemId)?.excludeFromScoring);
  const answered = eligibleIds
    .map((itemId) => itemScores[itemId])
    .filter((score) => score && !score.missing);

  const minAnsweredRatio = subscale.minAnsweredRatio ?? defaultMinAnsweredRatio;
  const answeredRatio = eligibleIds.length === 0 ? 0 : answered.length / eligibleIds.length;
  const complete = answeredRatio >= minAnsweredRatio;
  const values = answered.map((score) => score.scored);
  const scoreSum = values.length > 0 ? round(sum(values)) : null;
  const scoreMean = values.length > 0 ? round(mean(values)) : null;
  const score = complete && values.length > 0
    ? (method === "sum" ? scoreSum : scoreMean)
    : null;

  return {
    label: subscale.label ?? subscaleId,
    method,
    score,
    sum: complete ? scoreSum : null,
    mean: complete ? scoreMean : null,
    complete,
    itemCount: eligibleIds.length,
    answeredItems: answered.length,
    missingItems: eligibleIds.length - answered.length,
    minAnsweredRatio,
    itemIds: eligibleIds
  };
}

function sum(values) {
  return values.reduce((total, value) => total + value, 0);
}

function mean(values) {
  return sum(values) / values.length;
}

function round(value, digits = 3) {
  return Number(value.toFixed(digits));
}
