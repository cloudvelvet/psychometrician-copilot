const KNOWLEDGE_TOPICS = [
  {
    id: "reliability",
    title: "Reliability is conditional evidence, not a single cutoff",
    keywords: [
      "reliability",
      "cronbach",
      "alpha",
      "omega",
      "internal consistency",
      "신뢰도",
      "크론바흐",
      "오메가"
    ],
    summary: "Report reliability in relation to item count, construct breadth, score use, and model assumptions. Avoid treating alpha >= .70 as an absolute quality rule.",
    checks: [
      "Check item count and construct breadth before interpreting alpha.",
      "Prefer omega or model-based reliability when tau-equivalence is doubtful.",
      "Do not use respondent-level scores to infer cohort reliability."
    ]
  },
  {
    id: "validity_argument",
    title: "Validity is an argument about score use",
    keywords: [
      "validity",
      "construct validity",
      "criterion",
      "consequences",
      "타당도",
      "구성타당도",
      "준거",
      "점수 사용"
    ],
    summary: "Validity evidence should connect construct definition, response process, internal structure, relations to other variables, consequences, and intended score use.",
    checks: [
      "State the intended score use before choosing evidence.",
      "Separate evidence for internal structure from evidence for decisions made from scores.",
      "Flag unsupported diagnostic or selection claims."
    ]
  },
  {
    id: "ordinal_cfa",
    title: "Ordinal item data often needs ordinal-aware CFA",
    keywords: [
      "cfa",
      "confirmatory factor analysis",
      "lavaan",
      "likert",
      "ordinal",
      "wlsmv",
      "polychoric",
      "확인적 요인분석",
      "리커트",
      "순서형"
    ],
    summary: "Likert-type items with limited categories are often better treated as ordinal, especially when distributions are skewed or categories are sparse.",
    checks: [
      "Inspect category frequencies and missingness before fitting the model.",
      "Use ordinal estimators such as WLSMV when assumptions warrant it.",
      "Do not interpret CFI, TLI, RMSEA, or SRMR cutoffs as automatic pass/fail rules."
    ]
  },
  {
    id: "efa_cfa_sequence",
    title: "EFA and CFA answer different structure questions",
    keywords: [
      "efa",
      "exploratory factor analysis",
      "cfa",
      "scale development",
      "dimension",
      "요인분석",
      "탐색적",
      "확인적",
      "척도 개발",
      "차원성"
    ],
    summary: "Use EFA or dimensionality checks when the structure is uncertain; use CFA when a defensible a priori structure exists.",
    checks: [
      "Avoid using one sample to both discover and confirm a structure without acknowledging capitalization on chance.",
      "When sample size allows, split discovery and confirmation samples.",
      "Compare plausible competing models rather than relying on one default model."
    ]
  },
  {
    id: "irt_polytomous",
    title: "Match IRT family to item response format",
    keywords: [
      "irt",
      "rasch",
      "2pl",
      "3pl",
      "graded response",
      "gpcm",
      "mirt",
      "item response theory",
      "문항반응이론",
      "등급반응",
      "부분점수"
    ],
    summary: "Binary items call for binary IRT families; ordered Likert items call for polytomous models such as graded response or generalized partial credit models.",
    checks: [
      "Check dimensionality and local dependence before interpreting item parameters.",
      "Use enough respondents and item coverage for stable item calibration.",
      "Do not fit a binary 2PL model directly to 5-point Likert responses."
    ]
  },
  {
    id: "invariance_dif",
    title: "Group comparisons require fairness checks",
    keywords: [
      "dif",
      "measurement invariance",
      "group",
      "fairness",
      "bias",
      "semtools",
      "측정동일성",
      "차별기능문항",
      "집단",
      "공정성"
    ],
    summary: "Before comparing latent means or observed scores across groups, inspect measurement invariance and item-level differential functioning.",
    checks: [
      "Define the grouping variable and minimum group sizes.",
      "Test configural, metric, scalar, and partial invariance when appropriate.",
      "Treat DIF as a signal for expert review, not automatic item deletion."
    ]
  },
  {
    id: "adaptation",
    title: "Test adaptation is more than translation",
    keywords: [
      "adaptation",
      "translation",
      "itc",
      "culture",
      "back translation",
      "검사 번안",
      "번역",
      "역번역",
      "문화"
    ],
    summary: "Adapted tests need construct, language, cultural, administration, and score-interpretation evidence.",
    checks: [
      "Plan forward translation, review, back translation or equivalent committee review.",
      "Pilot for comprehension and culturally specific item functioning.",
      "Document any item changes and their measurement implications."
    ]
  },
  {
    id: "safety_privacy",
    title: "Psychological assessment outputs need safety and privacy boundaries",
    keywords: [
      "privacy",
      "diagnosis",
      "clinical",
      "hr",
      "hiring",
      "safety",
      "개인정보",
      "진단",
      "채용",
      "윤리",
      "안전"
    ],
    summary: "AI-generated assessment support should avoid diagnosis, unsupported high-stakes decisions, hidden score changes, and unnecessary storage of sensitive response data.",
    checks: [
      "Keep scoring deterministic and auditable.",
      "Do not let an LLM alter scores or invent clinical labels.",
      "Add consent, retention, deletion, and escalation policies before production use."
    ]
  }
];

export function listKnowledgeTopics() {
  return KNOWLEDGE_TOPICS.map((topic) => ({ ...topic, keywords: [...topic.keywords], checks: [...topic.checks] }));
}

export function retrieveKnowledge(query, options = {}) {
  const text = serializeQuery(query);
  const tokens = tokenize(text);
  const topN = options.topN ?? 5;

  const scored = KNOWLEDGE_TOPICS
    .map((topic) => {
      const matchedKeywords = topic.keywords.filter((keyword) => text.includes(keyword.toLowerCase()));
      const tokenMatches = topic.keywords.filter((keyword) => tokens.has(keyword.toLowerCase()));
      const score = matchedKeywords.length * 2 + tokenMatches.length;
      return { topic, score, matchedKeywords: [...new Set([...matchedKeywords, ...tokenMatches])] };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.topic.id.localeCompare(b.topic.id))
    .slice(0, topN)
    .map(({ topic, score, matchedKeywords }) => ({
      id: topic.id,
      title: topic.title,
      summary: topic.summary,
      checks: [...topic.checks],
      matchedKeywords,
      score
    }));

  if (scored.length > 0) {
    return scored;
  }

  return ["validity_argument", "safety_privacy"]
    .map((id) => KNOWLEDGE_TOPICS.find((topic) => topic.id === id))
    .filter(Boolean)
    .map((topic) => ({
      id: topic.id,
      title: topic.title,
      summary: topic.summary,
      checks: [...topic.checks],
      matchedKeywords: [],
      score: 0
    }));
}

function serializeQuery(query) {
  if (query === null || query === undefined) {
    return "";
  }
  if (typeof query === "string") {
    return query.toLowerCase();
  }
  if (Array.isArray(query)) {
    return query.map(serializeQuery).join(" ").toLowerCase();
  }
  if (typeof query === "object") {
    return Object.values(query).map(serializeQuery).join(" ").toLowerCase();
  }
  return String(query).toLowerCase();
}

function tokenize(text) {
  return new Set(text.split(/[^\p{L}\p{N}.]+/u).filter(Boolean));
}
