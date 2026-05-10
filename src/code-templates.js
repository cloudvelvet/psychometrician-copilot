export function buildCodeTemplates(context = {}, recommendations = [], options = {}) {
  if (!hasTemplateItems(context)) {
    return [];
  }

  const ids = new Set(recommendations.map((recommendation) => (
    typeof recommendation === "string" ? recommendation : recommendation.id
  )));
  const templateContext = normalizeTemplateContext(context, options);
  const templates = [];

  if ((ids.has("ordinal_cfa") || ids.has("cfa")) && hasPossibleFactorModel(templateContext)) {
    templates.push(buildCfaTemplate(templateContext, ids.has("ordinal_cfa")));
  }

  if (ids.has("efa_dimensionality")) {
    templates.push(buildEfaTemplate(templateContext));
  }

  if (ids.has("irt_polytomous")) {
    templates.push(buildPolytomousIrtTemplate(templateContext));
  }

  if (ids.has("irt_binary")) {
    templates.push(buildBinaryIrtTemplate(templateContext));
  }

  if (ids.has("measurement_invariance") && templateContext.groupVariable && hasPossibleFactorModel(templateContext)) {
    templates.push(buildInvarianceTemplate(templateContext));
  }

  if (ids.has("reliability_validity")) {
    templates.push(buildReliabilityTemplate(templateContext));
  }

  return templates;
}

function normalizeTemplateContext(context, options) {
  const itemCount = positiveInteger(context.itemCount) ?? options.defaultItemCount;
  const itemIds = Array.isArray(context.itemIds) && context.itemIds.length > 0
    ? context.itemIds.map(String)
    : Array.from({ length: itemCount }, (_, index) => `item${index + 1}`);

  return {
    ...context,
    itemCount: itemIds.length,
    itemIds,
    expectedFactors: positiveInteger(context.expectedFactors) ?? 1,
    groupVariable: context.groupVariable ?? null
  };
}

function hasTemplateItems(context) {
  return (Array.isArray(context.itemIds) && context.itemIds.length > 0) || positiveInteger(context.itemCount);
}

function hasPossibleFactorModel(context) {
  return !context.expectedFactors || context.expectedFactors <= context.itemIds.length;
}

function buildCfaTemplate(context, ordinal) {
  const items = rVector(context.itemIds);
  const model = factorModel(context);
  const orderedLine = ordinal ? ", ordered = items, estimator = \"WLSMV\"" : "";

  return {
    id: ordinal ? "lavaan_ordinal_cfa" : "lavaan_cfa",
    title: ordinal ? "Ordinal CFA with lavaan" : "CFA with lavaan",
    language: "r",
    packages: ["lavaan"],
    code: [
      "library(lavaan)",
      "",
      "# Replace dat with your cleaned item-level data frame.",
      `items <- ${items}`,
      "model <- '",
      model,
      "'",
      `fit <- cfa(model, data = dat${orderedLine})`,
      "summary(fit, fit.measures = TRUE, standardized = TRUE)",
      "lavInspect(fit, \"cov.lv\")"
    ].join("\n")
  };
}

function buildEfaTemplate(context) {
  return {
    id: "psych_efa_dimensionality",
    title: "Ordinal-aware EFA and dimensionality check",
    language: "r",
    packages: ["psych"],
    code: [
      "library(psych)",
      "",
      "# Replace dat with your cleaned item-level data frame.",
      `items <- ${rVector(context.itemIds)}`,
      "poly <- polychoric(dat[items])$rho",
      "fa.parallel(poly, n.obs = nrow(dat), fm = \"minres\")",
      `efa_fit <- fa(poly, nfactors = ${context.expectedFactors}, n.obs = nrow(dat), fm = "minres", rotate = "oblimin")`,
      "print(efa_fit$loadings, cutoff = .30)",
      "efa_fit"
    ].join("\n")
  };
}

function buildPolytomousIrtTemplate(context) {
  return {
    id: "mirt_graded_response",
    title: "Polytomous IRT with mirt graded response model",
    language: "r",
    packages: ["mirt"],
    code: [
      "library(mirt)",
      "",
      "# Ordered Likert-type items are modeled here with a graded response model.",
      `items <- ${rVector(context.itemIds)}`,
      `irt_fit <- mirt(dat[items], model = ${context.expectedFactors}, itemtype = "graded")`,
      "coef(irt_fit, IRTpars = TRUE, simplify = TRUE)",
      "itemfit(irt_fit)"
    ].join("\n")
  };
}

function buildBinaryIrtTemplate(context) {
  return {
    id: "mirt_binary_2pl",
    title: "Binary IRT with mirt 2PL model",
    language: "r",
    packages: ["mirt"],
    code: [
      "library(mirt)",
      "",
      "# Use Rasch/1PL instead of 2PL if the measurement argument requires equal discrimination.",
      `items <- ${rVector(context.itemIds)}`,
      `irt_fit <- mirt(dat[items], model = ${context.expectedFactors}, itemtype = "2PL")`,
      "coef(irt_fit, IRTpars = TRUE, simplify = TRUE)",
      "itemfit(irt_fit)"
    ].join("\n")
  };
}

function buildInvarianceTemplate(context) {
  return {
    id: "semtools_measurement_invariance",
    title: "Measurement invariance sequence",
    language: "r",
    packages: ["lavaan", "semTools"],
    code: [
      "library(lavaan)",
      "library(semTools)",
      "",
      `items <- ${rVector(context.itemIds)}`,
      "model <- '",
      factorModel(context),
      "'",
      `invariance_results <- measurementInvariance(model = model, data = dat, group = "${context.groupVariable}")`,
      "invariance_results"
    ].join("\n")
  };
}

function buildReliabilityTemplate(context) {
  return {
    id: "psych_reliability",
    title: "Internal consistency checks",
    language: "r",
    packages: ["psych"],
    code: [
      "library(psych)",
      "",
      `items <- ${rVector(context.itemIds)}`,
      "# Interpret alpha and omega with item count, construct breadth, and score use in mind.",
      "alpha(dat[items])",
      "omega(dat[items], poly = TRUE)"
    ].join("\n")
  };
}

function factorModel(context) {
  const factorCount = Math.max(1, context.expectedFactors);
  const buckets = Array.from({ length: factorCount }, () => []);

  context.itemIds.forEach((itemId, index) => {
    const bucketIndex = Math.min(factorCount - 1, Math.floor(index * factorCount / context.itemIds.length));
    buckets[bucketIndex].push(itemId);
  });

  return buckets
    .map((items, index) => `  f${index + 1} =~ ${items.join(" + ")}`)
    .join("\n");
}

function rVector(values) {
  return `c(${values.map((value) => JSON.stringify(value)).join(", ")})`;
}

function positiveInteger(value) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}
