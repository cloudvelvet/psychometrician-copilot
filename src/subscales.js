export function resolveSubscaleItemIds(scale, subscaleId) {
  const subscale = scale.subscales?.[subscaleId];
  if (!subscale) {
    return [];
  }

  if (Array.isArray(subscale.items)) {
    return [...subscale.items];
  }

  return (scale.items ?? [])
    .filter((item) => item.factor === subscaleId && !item.excludeFromScoring)
    .map((item) => item.id);
}

export function resolveScorableItemIds(scale) {
  return (scale.items ?? [])
    .filter((item) => !item.excludeFromScoring)
    .map((item) => item.id);
}
