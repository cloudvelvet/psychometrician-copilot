import { buildCodeTemplates } from "./code-templates.js";
import { retrieveKnowledge } from "./knowledge-base.js";

const AGENT_BOUNDARIES = [
  "The copilot recommends analysis plans; it does not validate an instrument by itself.",
  "Generated code is a starting template and must be reviewed against the actual data.",
  "Fit-index and reliability thresholds are never automatic pass/fail rules.",
  "Clinical, hiring, or other high-stakes uses require separate expert, legal, and ethics review."
];

export function createCopilotConsultation(input = {}, options = {}) {
  const context = normalizeStudyContext(input);
  const known = buildKnownFacts(context);
  const assumptions = buildAssumptions(context);
  const uncertain = buildUncertainties(context);
  const recommendedAnalyses = recommendAnalyses(context);
  const alternatives = buildAlternatives(context, recommendedAnalyses);
  const evidence = retrieveKnowledge({
    ...context,
    recommendations: recommendedAnalyses.map((analysis) => analysis.id)
  }, { topN: options.topN ?? 6 });
  const codeTemplates = options.includeCode === false
    ? []
    : buildCodeTemplates(context, recommendedAnalyses);
  const reportingGuidance = buildReportingGuidance(context, recommendedAnalyses);
  const limitations = buildLimitations(context);
  const critic = buildCritic({ context, uncertain, recommendedAnalyses, codeTemplates });

  return deepFreeze({
    schemaVersion: "psychometric_copilot_v1",
    nonDiagnostic: true,
    context,
    known,
    assumptions,
    uncertain,
    recommendedAnalyses,
    alternatives,
    evidence,
    codeTemplates,
    reportingGuidance,
    limitations,
    critic,
    agentBoundaries: [...AGENT_BOUNDARIES]
  });
}

export function normalizeStudyContext(input = {}) {
  const responseScale = normalizeResponseScale(input.responseScale ?? input.scale);
  const itemCount = positiveInteger(input.itemCount ?? input.numberOfItems ?? input.items?.length);
  const sampleSize = positiveInteger(input.sampleSize ?? input.n ?? input.respondents);
  const groups = normalizeGroups(input.groups);
  const groupComparison = Boolean(input.groupComparison ?? input.compareGroups ?? groups.length > 1);
  const groupVariable = stringOrNull(input.groupVariable);
  const expectedFactors = positiveInteger(input.expectedFactors ?? input.factorCount);
  const explicitItemIds = Array.isArray(input.itemIds) || Array.isArray(input.items);
  const itemIds = normalizeItemIds(input.itemIds ?? input.items, itemCount);

  return {
    purpose: stringOrNull(input.purpose ?? input.researchPurpose),
    construct: stringOrNull(input.construct),
    intendedUse: stringOrNull(input.intendedUse ?? input.scoreUse),
    itemType: normalizeItemType(input.itemType ?? input.responseFormat, responseScale),
    responseScale,
    itemCount,
    sampleSize,
    expectedFactors,
    hasPriorTheory: input.hasPriorTheory ?? Boolean(expectedFactors),
    itemIds,
    itemIdsGenerated: itemIds.length > 0 && !explicitItemIds,
    missingData: stringOrNull(input.missingData),
    distribution: stringOrNull(input.distribution),
    groups,
    groupComparison,
    groupVariable,
    groupVariableProvided: groupVariable !== null,
    software: normalizeSoftware(input.software),
    resultsProvided: Boolean(input.results ?? input.fitIndices ?? input.outputTable),
    highStakes: Boolean(input.highStakes) || containsHighStakes(input)
  };
}

export function recommendAnalyses(context) {
  const analyses = [
    {
      id: "data_screening",
      title: "Data screening before modeling",
      priority: "high",
      confidence: "high",
      rationale: "Missingness, response distributions, sparse categories, long-string patterns, and careless responding shape every downstream psychometric decision.",
      preconditions: ["Item-level response data", "Response scale metadata"],
      output: "Screening table and decisions about exclusions or sensitivity analyses"
    },
    {
      id: "reliability_validity",
      title: "Reliability and validity evidence plan",
      priority: "high",
      confidence: "high",
      rationale: "The agent should connect score interpretation to reliability evidence, construct definition, intended use, and validity argument rather than a single coefficient.",
      preconditions: ["Construct definition", "Intended score use", "Sufficient respondent records"],
      output: "Alpha/omega plan, validity evidence matrix, and reporting caveats"
    }
  ];

  if (needsExploration(context)) {
    analyses.push({
      id: "efa_dimensionality",
      title: "EFA or dimensionality check",
      priority: context.expectedFactors ? "medium" : "high",
      confidence: context.sampleSize ? "medium" : "low",
      rationale: "Use exploratory structure checks when the factor structure is new, weakly theorized, or not yet supported in the target population.",
      preconditions: ["Adequate sample size", "Inter-item association matrix", "Rotation decision"],
      output: "Candidate dimensionality, cross-loading review, and competing model candidates"
    });
  }

  if (context.expectedFactors && !hasImpossibleFactorCount(context)) {
    const ordinal = context.itemType === "ordinal_likert" || context.itemType === "ordinal";
    analyses.push({
      id: ordinal ? "ordinal_cfa" : "cfa",
      title: ordinal ? "Ordinal CFA for the hypothesized structure" : "CFA for the hypothesized structure",
      priority: "high",
      confidence: modelConfidence(context),
      rationale: ordinal
        ? "A hypothesized factor structure with limited Likert categories should usually be tested with ordinal-aware estimation after category diagnostics."
        : "A hypothesized factor structure can be tested with CFA when the measurement model is specified before looking at fit.",
      preconditions: ["A priori factor model", "Item-to-factor mapping", "Missing-data plan", "Fit and residual diagnostics"],
      output: "Factor loadings, fit indices, residual diagnostics, and model-comparison notes"
    });
  }

  if (context.itemType === "ordinal_likert" && enoughItemsForIrt(context)) {
    analyses.push({
      id: "irt_polytomous",
      title: "Polytomous IRT sensitivity analysis",
      priority: "medium",
      confidence: modelConfidence(context),
      rationale: "Likert-type items can be examined with graded response or generalized partial credit models when dimensionality and local dependence are defensible.",
      preconditions: ["Dimensionality evidence", "Local dependence review", "Enough respondents for stable calibration"],
      output: "Item thresholds, discrimination estimates, item fit, and information curves"
    });
  } else if (context.itemType === "binary" && enoughItemsForIrt(context)) {
    analyses.push({
      id: "irt_binary",
      title: "Binary IRT model check",
      priority: "medium",
      confidence: modelConfidence(context),
      rationale: "Binary items can be examined with Rasch/1PL or 2PL models after dimensionality and local dependence checks.",
      preconditions: ["Binary item responses", "Dimensionality evidence", "Local dependence review"],
      output: "Difficulty/discrimination estimates, item fit, and information curves"
    });
  }

  if (context.groupComparison) {
    analyses.push({
      id: "measurement_invariance",
      title: "Measurement invariance before latent mean comparison",
      priority: "high",
      confidence: context.groups.length > 1 && context.groupVariableProvided ? "medium" : "low",
      rationale: "Group score comparisons require evidence that the construct is measured comparably across groups.",
      preconditions: ["Grouping variable", "Adequate group sizes", "Baseline factor model"],
      output: "Configural, metric, scalar, and partial-invariance decision trail"
    });
    analyses.push({
      id: "dif_screening",
      title: "DIF screening for item-level fairness",
      priority: "medium",
      confidence: context.groups.length > 1 && context.groupVariableProvided ? "medium" : "low",
      rationale: "DIF checks help locate items whose functioning differs across groups after matching on the measured trait.",
      preconditions: ["Grouping variable", "Matching variable or latent trait estimate", "Expert item review plan"],
      output: "Flagged items and expert-review notes"
    });
  }

  if (mentionsAdaptation(context)) {
    analyses.push({
      id: "adaptation_checklist",
      title: "Test adaptation checklist",
      priority: "high",
      confidence: "medium",
      rationale: "Translation and cultural adaptation need evidence beyond literal wording equivalence.",
      preconditions: ["Source instrument permissions", "Translation/review process", "Pilot participants"],
      output: "Adaptation evidence log and item revision record"
    });
  }

  return analyses;
}

function buildKnownFacts(context) {
  const facts = [];
  addFact(facts, "purpose", "Research purpose", context.purpose);
  addFact(facts, "construct", "Construct", context.construct);
  addFact(facts, "intendedUse", "Intended score use", context.intendedUse);
  addFact(facts, "itemType", "Item type", context.itemType);
  addFact(facts, "responseScale", "Response scale", context.responseScale
    ? `${context.responseScale.min}-${context.responseScale.max} (${context.responseScale.categories} categories)`
    : null);
  addFact(facts, "itemCount", "Item count", context.itemCount);
  addFact(facts, "sampleSize", "Sample size", context.sampleSize);
  addFact(facts, "expectedFactors", "Expected factors", context.expectedFactors);
  addFact(facts, "groups", "Groups", context.groups.length > 0 ? context.groups.join(", ") : null);
  addFact(facts, "groupVariable", "Grouping variable", context.groupVariable);
  addFact(facts, "groupComparison", "Group comparison needed", context.groupComparison);
  return facts;
}

function buildAssumptions(context) {
  const assumptions = [
    "The consultation is planning support; a domain expert remains responsible for final analytic decisions.",
    "Scores and model results should be generated by deterministic statistical code, not by an LLM."
  ];

  if (!context.responseScale && context.itemType === "ordinal_likert") {
    assumptions.push("Item responses are treated as ordered categories until the actual response scale is supplied.");
  }
  if (context.itemIdsGenerated) {
    assumptions.push("Template item IDs are generated as item1, item2, ... and should be replaced with real column names.");
  }
  if (context.resultsProvided) {
    assumptions.push("Provided result tables are treated as user-supplied summaries and should be checked against the original analysis output.");
  }
  return assumptions;
}

function buildUncertainties(context) {
  const uncertain = [];
  addUncertain(uncertain, !context.purpose, "purpose", "Research purpose is not specified.");
  addUncertain(uncertain, !context.construct, "construct", "Construct definition is not specified.");
  addUncertain(uncertain, !context.intendedUse, "intended_use", "Intended score use is not specified.");
  addUncertain(uncertain, !context.itemCount, "item_count", "Number of items is not specified.");
  addUncertain(uncertain, !context.sampleSize, "sample_size", "Sample size is not specified.");
  addUncertain(uncertain, !context.responseScale, "response_scale", "Response scale categories are not specified.");
  addUncertain(uncertain, !context.missingData, "missing_data", "Missing-data pattern is not specified.");
  addUncertain(uncertain, !context.distribution, "distribution", "Item category distributions are not specified.");
  addUncertain(
    uncertain,
    context.groupComparison && !context.groupVariableProvided,
    "group_variable",
    "Grouping variable column is not specified."
  );
  addUncertain(
    uncertain,
    context.groupComparison && context.groups.length < 2,
    "group_sizes",
    "Group labels or group sizes are needed for invariance/DIF planning."
  );
  return uncertain;
}

function buildAlternatives(context, analyses) {
  const ids = new Set(analyses.map((analysis) => analysis.id));
  const alternatives = [];

  if (ids.has("ordinal_cfa")) {
    alternatives.push({
      id: "robust_ml_cfa",
      when: "If items have many categories and distributions are approximately continuous.",
      tradeoff: "Easier missing-data handling in some workflows, but less appropriate for sparse ordinal categories."
    });
  }
  if (ids.has("efa_dimensionality") && ids.has("ordinal_cfa")) {
    alternatives.push({
      id: "split_sample_efa_cfa",
      when: "If sample size is large enough to separate discovery from confirmation.",
      tradeoff: "Reduces overfitting, but each model receives fewer cases."
    });
  }
  if (ids.has("irt_polytomous") || ids.has("irt_binary")) {
    alternatives.push({
      id: "ctt_first_pass",
      when: "If sample size is too small for stable IRT calibration.",
      tradeoff: "Less item-parameter detail, but more stable for early pilots."
    });
  }
  if (context.groupComparison) {
    alternatives.push({
      id: "partial_invariance_or_alignment",
      when: "If full scalar invariance is not supported.",
      tradeoff: "Can preserve some group comparison, but requires transparent reporting and expert judgment."
    });
  }
  return alternatives;
}

function buildReportingGuidance(context, analyses) {
  const ids = new Set(analyses.map((analysis) => analysis.id));
  const guidance = [
    "Separate what was observed in the data from what is inferred about the construct.",
    "Report assumptions, estimation choices, missing-data handling, and any sensitivity analyses.",
    "Avoid absolute language such as 'the model is valid' or 'alpha proves reliability'."
  ];

  if (ids.has("ordinal_cfa") || ids.has("cfa")) {
    guidance.push("For CFA, report factor loadings, fit indices, residual diagnostics, and plausible alternative models.");
  }
  if (ids.has("irt_polytomous") || ids.has("irt_binary")) {
    guidance.push("For IRT, report dimensionality/local-dependence checks before item parameters and information curves.");
  }
  if (context.groupComparison) {
    guidance.push("For group comparisons, report the invariance/DIF decision trail before comparing scores or latent means.");
  }
  if (context.highStakes) {
    guidance.push("For high-stakes use, state that the output is not sufficient for selection, diagnosis, or treatment decisions without external validation.");
  }
  return guidance;
}

function buildLimitations(context) {
  const limitations = [
    "This MVP does not execute R code or inspect raw data distributions.",
    "The local knowledge registry is a seed retrieval layer, not a complete literature database.",
    "Generated templates require real item-to-factor mappings before use."
  ];

  if (!context.sampleSize) {
    limitations.push("Model feasibility cannot be judged confidently without sample size.");
  }
  if (!context.itemCount) {
    limitations.push("Reliability, CFA, and IRT planning are provisional without item count.");
  }
  if (context.highStakes) {
    limitations.push("High-stakes uses need consent, privacy, adverse-impact, and expert-review workflows outside this MVP.");
  }
  return limitations;
}

function buildCritic({ context, uncertain, recommendedAnalyses, codeTemplates }) {
  const warnings = [];
  const nextQuestions = uncertain.slice(0, 5).map((item) => item.question);
  const ids = new Set(recommendedAnalyses.map((analysis) => analysis.id));
  const addWarning = ({ id, severity = "flag", source = "copilot", blocking, message }) => {
    warnings.push({
      id,
      severity,
      source,
      blocking: blocking ?? severity === "error",
      message
    });
  };

  if (uncertain.length > 0) {
    addWarning({
      id: "missing_design_facts",
      message: "Several required design facts are missing; treat recommendations as provisional."
    });
  }
  if (context.sampleSize && context.itemCount && context.sampleSize < context.itemCount * 5) {
    addWarning({
      id: "small_sample_relative_to_items",
      severity: "error",
      message: "Sample size is small relative to item count; complex CFA/IRT estimates may be unstable."
    });
  }
  if (hasImpossibleFactorCount(context)) {
    addWarning({
      id: "impossible_factor_count",
      severity: "error",
      message: "Expected factor count exceeds item count; revise the factor model before generating CFA or IRT templates."
    });
  }
  if (context.groupComparison && !context.groupVariableProvided) {
    addWarning({
      id: "missing_group_variable",
      severity: "error",
      message: "Grouped analysis needs an explicit grouping-variable column before invariance or DIF code can be run."
    });
  }
  if (context.itemType === "ordinal_likert" && ids.has("cfa")) {
    addWarning({
      id: "ordinal_modeled_as_continuous",
      message: "Ordinal Likert data should not be modeled as continuous without checking category behavior."
    });
  }
  if (context.groupComparison && !ids.has("measurement_invariance")) {
    addWarning({
      id: "missing_group_comparability_plan",
      severity: "error",
      message: "Group comparisons should not proceed without measurement-invariance or fairness evidence."
    });
  }
  if (context.highStakes) {
    addWarning({
      id: "high_stakes_scope",
      severity: "error",
      source: "safety",
      message: "High-stakes interpretation is outside the safe scope of this MVP without separate validation and governance."
    });
  }
  if (codeTemplates.length > 0) {
    addWarning({
      id: "placeholder_code",
      source: "code_template",
      message: "Generated code uses placeholder data frame and item IDs; replace them before execution."
    });
  }

  return {
    status: warnings.length > 0 ? "needs_review" : "ready_for_expert_review",
    warnings,
    nextQuestions,
    mustNotDo: [
      "Do not use alpha > .70 or fit-index cutoffs as automatic acceptance rules.",
      "Do not diagnose individuals from questionnaire scores.",
      "Do not compare groups before checking measurement comparability.",
      "Do not let an LLM recalculate or silently adjust scores."
    ]
  };
}

function needsExploration(context) {
  const purpose = `${context.purpose ?? ""} ${context.construct ?? ""}`.toLowerCase();
  return !context.expectedFactors ||
    purpose.includes("develop") ||
    purpose.includes("explor") ||
    purpose.includes("new scale");
}

function mentionsAdaptation(context) {
  const text = `${context.purpose ?? ""} ${context.construct ?? ""} ${context.intendedUse ?? ""}`.toLowerCase();
  return text.includes("adapt") || text.includes("translation");
}

function hasImpossibleFactorCount(context) {
  return Boolean(context.expectedFactors && context.itemCount && context.expectedFactors > context.itemCount);
}

function enoughItemsForIrt(context) {
  return !context.itemCount || context.itemCount >= 5;
}

function modelConfidence(context) {
  if (!context.sampleSize) {
    return "low";
  }
  if (context.itemCount && context.sampleSize < Math.max(150, context.itemCount * 5)) {
    return "low";
  }
  if (context.sampleSize >= 300) {
    return "medium";
  }
  return "medium-low";
}

function normalizeResponseScale(scale) {
  if (!scale || typeof scale !== "object") {
    return null;
  }
  const min = Number(scale.min);
  const max = Number(scale.max);
  if (!Number.isFinite(min) || !Number.isFinite(max) || min >= max) {
    return null;
  }
  return {
    min,
    max,
    categories: max - min + 1,
    labels: scale.labels ? { ...scale.labels } : null
  };
}

function normalizeItemType(itemType, responseScale) {
  const value = stringOrNull(itemType)?.toLowerCase();
  if (value) {
    if (value.includes("binary") || value.includes("dichotom")) {
      return "binary";
    }
    if (value.includes("ordinal") || value.includes("likert")) {
      return "ordinal_likert";
    }
    if (value.includes("continuous")) {
      return "continuous";
    }
    return value;
  }

  if (responseScale?.categories === 2) {
    return "binary";
  }
  if (responseScale && responseScale.categories <= 7) {
    return "ordinal_likert";
  }
  return "ordinal_likert";
}

function normalizeGroups(groups) {
  if (!Array.isArray(groups)) {
    return [];
  }
  return groups
    .map((group) => typeof group === "object" ? group.label ?? group.name ?? group.id : group)
    .filter((group) => group !== null && group !== undefined && String(group).trim() !== "")
    .map(String);
}

function normalizeSoftware(software) {
  if (!software) {
    return ["lavaan", "mirt", "psych", "semTools"];
  }
  return Array.isArray(software) ? software.map(String) : [String(software)];
}

function normalizeItemIds(itemsOrIds, itemCount) {
  if (!Array.isArray(itemsOrIds)) {
    return itemCount
      ? Array.from({ length: itemCount }, (_, index) => `item${index + 1}`)
      : [];
  }
  const ids = itemsOrIds.map((item, index) => {
    if (typeof item === "string") {
      return item;
    }
    return item?.id ?? item?.name ?? `item${index + 1}`;
  });
  if (ids.length > 0) {
    return ids.map(String);
  }
  if (!itemCount) {
    return [];
  }
  return Array.from({ length: itemCount }, (_, index) => `item${index + 1}`);
}

function containsHighStakes(input) {
  const text = Object.values(input)
    .join(" ")
    .toLowerCase()
    .replace(/non[-\s]?diagnostic/g, "")
    .replace(/not\s+a\s+diagnosis/g, "");
  return text.includes("diagnos") ||
    text.includes("clinical") ||
    text.includes("hiring") ||
    text.includes("employee selection") ||
    text.includes("personnel selection") ||
    text.includes("admission decision") ||
    text.includes("treatment decision");
}

function addFact(facts, field, label, value) {
  if (value === null || value === undefined || value === "") {
    return;
  }
  facts.push({ field, label, value });
}

function addUncertain(list, condition, id, question) {
  if (condition) {
    list.push({ id, question });
  }
}

function positiveInteger(value) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}

function stringOrNull(value) {
  if (value === null || value === undefined) {
    return null;
  }
  const string = String(value).trim();
  return string === "" ? null : string;
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
