import { STANDARDS_2014_TOPICS } from "./standards-2014.js";
import { MARKDOWN_KB_TOPICS } from "./generated-kb.js";

const CORE_TOPICS = [
  {
    id: "data_screening",
    title: "Data screening comes before model interpretation",
    relatedAnalyses: ["data_screening"],
    keywords: [
      "data_screening",
      "screening",
      "missingness",
      "sparse categories",
      "long-string",
      "careless responding",
      "결측",
      "범주 빈도",
      "응답 품질",
      "불성실 응답"
    ],
    summary: "Before choosing CFA, IRT, or score comparisons, inspect missingness, category use, response patterns, attention checks, and sparse cells.",
    checks: [
      "Review missing-response rates by item, person, and group.",
      "Inspect item category frequencies before treating Likert data as continuous.",
      "Flag long-string, near-zero variance, failed attention checks, and extreme response patterns."
    ],
    useWhen: [
      "Any item-level dataset is being prepared for psychometric modeling.",
      "The user has not supplied missing-data or response-distribution details."
    ]
  },
  {
    id: "missing_data",
    title: "Missing data needs a stated handling plan",
    relatedAnalyses: ["data_screening", "cfa", "ordinal_cfa", "irt_polytomous"],
    keywords: [
      "missing_data",
      "missing",
      "missingness",
      "fiml",
      "multiple imputation",
      "pairwise",
      "listwise",
      "결측",
      "결측치",
      "완전제거",
      "다중대체"
    ],
    summary: "Psychometric conclusions depend on whether missingness is rare, systematic, item-specific, or group-specific.",
    checks: [
      "Report the missing-data rule before estimating reliability or factor models.",
      "Check whether missingness differs by group before group comparisons.",
      "Avoid silently changing the denominator for subscale scores without documenting the rule."
    ],
    useWhen: [
      "The study context omits missing-data information.",
      "Group comparison or longitudinal comparison is planned."
    ]
  },
  {
    id: "category_diagnostics",
    title: "Likert category diagnostics shape estimator choice",
    relatedAnalyses: ["ordinal_cfa", "cfa", "irt_polytomous"],
    keywords: [
      "category_diagnostics",
      "likert",
      "ordinal",
      "threshold",
      "polychoric",
      "skew",
      "floor effect",
      "ceiling effect",
      "리커트",
      "순서형",
      "천장효과",
      "바닥효과",
      "범주"
    ],
    summary: "Limited Likert categories should be examined for sparse, unused, skewed, or collapsed response categories before model estimation.",
    checks: [
      "Inspect category frequencies for every item.",
      "Consider ordinal-aware estimators when categories are few or skewed.",
      "Do not collapse categories automatically; document the substantive reason if collapsing is needed."
    ],
    useWhen: [
      "The response format is Likert or another ordered category scale.",
      "Items have five or fewer categories or visibly skewed response distributions."
    ]
  },
  {
    id: "reliability",
    title: "Reliability is conditional evidence, not a single cutoff",
    relatedAnalyses: ["reliability_validity"],
    keywords: [
      "reliability",
      "cronbach",
      "alpha",
      "omega",
      "internal consistency",
      "신뢰도",
      "크론바흐",
      "오메가",
      "내적일관성"
    ],
    summary: "Report reliability in relation to item count, construct breadth, score use, and model assumptions. Avoid treating alpha >= .70 as an absolute quality rule.",
    checks: [
      "Check item count and construct breadth before interpreting alpha.",
      "Prefer omega or model-based reliability when tau-equivalence is doubtful.",
      "Do not use respondent-level scores to infer cohort reliability."
    ],
    useWhen: [
      "The user asks whether a scale is reliable.",
      "Score interpretation or research reporting is planned."
    ]
  },
  {
    id: "validity_argument",
    title: "Validity is an argument about score use",
    relatedAnalyses: ["reliability_validity"],
    keywords: [
      "validity",
      "construct validity",
      "criterion",
      "response process",
      "consequences",
      "score use",
      "타당도",
      "구성타당도",
      "준거",
      "점수 사용",
      "결과 타당도"
    ],
    summary: "Validity evidence should connect construct definition, response process, internal structure, relations to other variables, consequences, and intended score use.",
    checks: [
      "State the intended score use before choosing evidence.",
      "Separate evidence for internal structure from evidence for decisions made from scores.",
      "Flag unsupported diagnostic or selection claims."
    ],
    useWhen: [
      "The user asks whether an instrument is valid.",
      "The app needs to warn against overclaiming from one coefficient or fit index."
    ]
  },
  {
    id: "ordinal_cfa",
    title: "Ordinal item data often needs ordinal-aware CFA",
    relatedAnalyses: ["ordinal_cfa", "cfa"],
    keywords: [
      "ordinal_cfa",
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
    ],
    useWhen: [
      "A hypothesized factor model exists for ordered item responses.",
      "The user supplies a Likert response scale with limited categories."
    ]
  },
  {
    id: "efa_cfa_sequence",
    title: "EFA and CFA answer different structure questions",
    relatedAnalyses: ["efa_dimensionality", "ordinal_cfa", "cfa"],
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
    ],
    useWhen: [
      "The study is developing a new scale.",
      "Expected factors are unknown or weakly justified."
    ]
  },
  {
    id: "local_dependence",
    title: "Local dependence can distort IRT and CFA conclusions",
    relatedAnalyses: ["irt_polytomous", "irt_binary", "ordinal_cfa", "cfa"],
    keywords: [
      "local_dependence",
      "local dependence",
      "residual correlation",
      "item wording",
      "method factor",
      "문항 의존",
      "잔차상관",
      "방법효과",
      "문항 문구"
    ],
    summary: "Items with shared wording, stems, content overlap, or method effects can inflate reliability and bias model parameters.",
    checks: [
      "Inspect residual correlations or local-dependence indices after the baseline model.",
      "Review item wording before adding correlated residuals.",
      "Treat model modifications as theory-sensitive decisions, not purely fit-driven repairs."
    ],
    useWhen: [
      "IRT is requested for clustered or similarly worded items.",
      "CFA fit is poor and residual diagnostics show item-pair dependence."
    ]
  },
  {
    id: "irt_polytomous",
    title: "Match IRT family to item response format",
    relatedAnalyses: ["irt_polytomous", "irt_binary"],
    keywords: [
      "irt_polytomous",
      "irt_binary",
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
    ],
    useWhen: [
      "The user asks for IRT with ordered Likert responses.",
      "Item-level parameter diagnostics are useful as a sensitivity analysis."
    ]
  },
  {
    id: "invariance_dif",
    title: "Group comparisons require fairness checks",
    relatedAnalyses: ["measurement_invariance", "dif_screening"],
    keywords: [
      "measurement_invariance",
      "dif_screening",
      "dif",
      "group",
      "fairness",
      "bias",
      "semtools",
      "측정동일성",
      "차별기능문항",
      "집단",
      "공정성",
      "편향"
    ],
    summary: "Before comparing latent means or observed scores across groups, inspect measurement invariance and item-level differential functioning.",
    checks: [
      "Define the grouping variable and minimum group sizes.",
      "Test configural, metric, scalar, and partial invariance when appropriate.",
      "Treat DIF as a signal for expert review, not automatic item deletion."
    ],
    useWhen: [
      "The study asks for group comparison.",
      "The same score will be interpreted across demographic, language, or site groups."
    ]
  },
  {
    id: "adaptation",
    title: "Test adaptation is more than translation",
    relatedAnalyses: ["adaptation_checklist"],
    keywords: [
      "adaptation",
      "translation",
      "itc",
      "culture",
      "back translation",
      "검사 번안",
      "번역",
      "역번역",
      "문화",
      "문화적 적합성"
    ],
    summary: "Adapted tests need construct, language, cultural, administration, and score-interpretation evidence.",
    checks: [
      "Plan forward translation, review, back translation or equivalent committee review.",
      "Pilot for comprehension and culturally specific item functioning.",
      "Document any item changes and their measurement implications."
    ],
    useWhen: [
      "A scale is translated, localized, or moved into a new population.",
      "The construct may not carry the same meaning across cultures or languages."
    ]
  },
  {
    id: "safety_privacy",
    title: "Psychological assessment outputs need safety and privacy boundaries",
    relatedAnalyses: ["reliability_validity"],
    keywords: [
      "privacy",
      "diagnosis",
      "clinical",
      "hr",
      "hiring",
      "safety",
      "high stakes",
      "개인정보",
      "진단",
      "채용",
      "윤리",
      "안전",
      "고위험"
    ],
    summary: "AI-generated assessment support should avoid diagnosis, unsupported high-stakes decisions, hidden score changes, and unnecessary storage of sensitive response data.",
    checks: [
      "Keep scoring deterministic and auditable.",
      "Do not let an LLM alter scores or invent clinical labels.",
      "Add consent, retention, deletion, and escalation policies before production use."
    ],
    useWhen: [
      "The intended use mentions clinical, HR, hiring, treatment, or high-stakes decisions.",
      "The app displays respondent-level feedback."
    ]
  }
];

export const KNOWLEDGE_TOPICS = [
  ...CORE_TOPICS,
  ...STANDARDS_2014_TOPICS,
  ...MARKDOWN_KB_TOPICS
];
