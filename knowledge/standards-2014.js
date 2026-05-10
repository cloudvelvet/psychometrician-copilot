const STANDARDS_2014_SOURCE = {
  citation: "AERA, APA, & NCME (2014). Standards for Educational and Psychological Testing.",
  type: "book",
  note: "Paraphrased knowledge card derived from the 2014 Standards; not a reproduction of standards text."
};

export const STANDARDS_2014_TOPICS = [
  {
    id: "standards_2014_validity_use",
    title: "Validity evidence starts with intended score interpretation and use",
    source: STANDARDS_2014_SOURCE,
    relatedAnalyses: ["reliability_validity", "ordinal_cfa", "cfa", "efa_dimensionality"],
    keywords: [
      "standards 2014",
      "validity",
      "intended use",
      "interpretation",
      "validation",
      "construct",
      "response process",
      "relations to other variables",
      "consequences",
      "타당도",
      "점수 해석",
      "점수 사용",
      "구성개념"
    ],
    summary: "Validation should be framed as an argument for a specific interpretation and use, drawing on multiple sources of evidence rather than a single fit index or coefficient.",
    checks: [
      "Write the intended interpretation and decision context before selecting analyses.",
      "Connect internal structure evidence to content, response process, relations to other variables, and consequences.",
      "Flag any new use of an existing score as requiring its own evidence trail."
    ],
    useWhen: [
      "The user asks whether a scale is valid.",
      "The same score will be reused for a new population, language, or decision."
    ]
  },
  {
    id: "standards_2014_reliability_precision",
    title: "Reliability evidence should describe precision, error, and decision consistency",
    source: STANDARDS_2014_SOURCE,
    relatedAnalyses: ["reliability_validity"],
    keywords: [
      "standards 2014",
      "reliability",
      "precision",
      "measurement error",
      "standard error",
      "sem",
      "decision consistency",
      "generalizability",
      "신뢰도",
      "측정오차",
      "표준오차",
      "의사결정 일관성"
    ],
    summary: "Reliability is evidence about score precision under defined testing conditions; reports should describe error, replication conditions, and decision consistency when scores guide classifications.",
    checks: [
      "Report the population, testing conditions, and score level for reliability evidence.",
      "Include standard errors or conditional precision when individual interpretation matters.",
      "For pass/fail or risk bands, examine classification consistency instead of only alpha."
    ],
    useWhen: [
      "The app reports reliability or score confidence.",
      "The study uses cut scores, bands, or individual feedback."
    ]
  },
  {
    id: "standards_2014_fairness",
    title: "Fairness means reducing construct-irrelevant barriers to valid interpretation",
    source: STANDARDS_2014_SOURCE,
    relatedAnalyses: ["measurement_invariance", "dif_screening", "data_screening", "adaptation_checklist"],
    keywords: [
      "standards 2014",
      "fairness",
      "bias",
      "barriers",
      "accommodation",
      "accessibility",
      "subgroup",
      "dif",
      "measurement invariance",
      "공정성",
      "편향",
      "장벽",
      "조정",
      "집단"
    ],
    summary: "Fair testing requires evidence that score interpretations remain appropriate across relevant groups and that test design, administration, and accommodations do not add irrelevant barriers.",
    checks: [
      "Identify relevant groups before interpreting subgroup differences.",
      "Use invariance, DIF, accessibility, and response-process evidence as complementary checks.",
      "Document accommodations and evaluate whether they preserve the intended construct."
    ],
    useWhen: [
      "Group comparison is requested.",
      "The target population includes language, disability, cultural, or access differences."
    ]
  },
  {
    id: "standards_2014_test_design",
    title: "Test design should start from specifications, content coverage, and item review",
    source: STANDARDS_2014_SOURCE,
    relatedAnalyses: ["efa_dimensionality", "reliability_validity", "data_screening"],
    keywords: [
      "standards 2014",
      "test design",
      "test development",
      "test specifications",
      "blueprint",
      "item review",
      "content coverage",
      "revision",
      "검사 개발",
      "검사 명세",
      "문항 검토",
      "내용 범위"
    ],
    summary: "A defensible instrument needs documented specifications, item-development rationale, review procedures, form assembly rules, and revision records before statistical fit is treated as meaningful.",
    checks: [
      "Record the construct map, item targets, response format, and scoring plan.",
      "Review items for content relevance, clarity, bias, accessibility, and administration constraints.",
      "Track revisions so later evidence is tied to the version actually used."
    ],
    useWhen: [
      "The user is developing or revising a scale.",
      "The item list exists but the construct blueprint is unclear."
    ]
  },
  {
    id: "standards_2014_scores_norms_cuts",
    title: "Scores, norms, links, and cut scores need separate evidence",
    source: STANDARDS_2014_SOURCE,
    relatedAnalyses: ["reliability_validity", "data_screening"],
    keywords: [
      "standards 2014",
      "score interpretation",
      "norms",
      "scale score",
      "score linking",
      "equating",
      "cut score",
      "classification",
      "점수 해석",
      "규준",
      "절단점수",
      "분류"
    ],
    summary: "Raw scores, scale scores, norms, linked scores, and cut scores are not interchangeable; each needs evidence for the intended interpretation and decision.",
    checks: [
      "State whether feedback uses raw means, scale scores, percentile norms, or classifications.",
      "Do not introduce cut scores without a documented standard-setting rationale.",
      "If forms or versions are linked, report the linking design and uncertainty."
    ],
    useWhen: [
      "The app displays score bands or labels.",
      "The study plans norm-referenced or criterion-referenced interpretation."
    ]
  },
  {
    id: "standards_2014_admin_scoring_reporting",
    title: "Administration, scoring, reporting, and interpretation are part of validity",
    source: STANDARDS_2014_SOURCE,
    relatedAnalyses: ["data_screening", "reliability_validity"],
    keywords: [
      "standards 2014",
      "administration",
      "scoring",
      "reporting",
      "interpretation",
      "score report",
      "standardization",
      "검사 실시",
      "채점",
      "보고",
      "해석"
    ],
    summary: "Even a well-designed scale can be undermined by inconsistent administration, opaque scoring, unclear reports, or interpretations that exceed the evidence.",
    checks: [
      "Document administration mode, instructions, timing, scoring rules, and quality-control checks.",
      "Make reports understandable to the intended audience without overstating certainty.",
      "Keep automated interpretation aligned with the validated score use."
    ],
    useWhen: [
      "The app generates respondent feedback.",
      "The same measure is administered across sites, modes, or groups."
    ]
  },
  {
    id: "standards_2014_documentation",
    title: "Technical documentation should make use, limits, and evidence auditable",
    source: STANDARDS_2014_SOURCE,
    relatedAnalyses: ["reliability_validity", "ordinal_cfa", "irt_polytomous", "measurement_invariance"],
    keywords: [
      "standards 2014",
      "documentation",
      "technical manual",
      "test manual",
      "evidence",
      "appropriate use",
      "limitations",
      "문서화",
      "기술문서",
      "검사 매뉴얼",
      "사용 한계"
    ],
    summary: "Users need documentation that explains appropriate uses, development history, administration, scoring, reliability, validity evidence, limitations, and update timing.",
    checks: [
      "Keep a versioned record of scale content, scoring changes, and validation samples.",
      "Document what the score may and may not support.",
      "Make generated code templates traceable to the data and model actually used."
    ],
    useWhen: [
      "The user asks how to publish or deploy the tool.",
      "A research report or technical appendix is being prepared."
    ]
  },
  {
    id: "standards_2014_test_taker_rights",
    title: "Test takers need clear information, protected results, and fair reports",
    source: STANDARDS_2014_SOURCE,
    relatedAnalyses: ["reliability_validity"],
    keywords: [
      "standards 2014",
      "test taker",
      "rights",
      "informed consent",
      "privacy",
      "score access",
      "unauthorized use",
      "fair report",
      "응답자 권리",
      "동의",
      "개인정보",
      "결과 접근"
    ],
    summary: "Assessment workflows should tell participants what the test is for, protect score use, provide fair reporting, and avoid hidden secondary uses.",
    checks: [
      "Explain purpose, voluntary status, data use, storage, and result access before response collection.",
      "Avoid exposing raw responses unnecessarily in AI-facing payloads.",
      "Use report language that supports reflection without diagnosis or selection claims."
    ],
    useWhen: [
      "The app collects individual responses.",
      "Feedback is shown directly to participants."
    ]
  },
  {
    id: "standards_2014_test_user_responsibilities",
    title: "Test users are responsible for appropriate selection, interpretation, and security",
    source: STANDARDS_2014_SOURCE,
    relatedAnalyses: ["reliability_validity", "data_screening"],
    keywords: [
      "standards 2014",
      "test user",
      "responsibility",
      "appropriate use",
      "test security",
      "copyright",
      "qualification",
      "사용자 책임",
      "적절한 사용",
      "검사 보안",
      "저작권",
      "자격"
    ],
    summary: "People who select or use tests should verify that the instrument, administration, interpretation, and data handling fit the intended purpose and their qualifications.",
    checks: [
      "Require the user to state the intended use before producing recommendations.",
      "Warn when requested use exceeds non-diagnostic research feedback.",
      "Protect copyrighted item content and avoid publishing restricted materials."
    ],
    useWhen: [
      "The tool might be used beyond research planning.",
      "The user wants to upload licensed or copyrighted instruments."
    ]
  },
  {
    id: "standards_2014_psychological_assessment",
    title: "Psychological assessment requires qualified interpretation and collateral context",
    source: STANDARDS_2014_SOURCE,
    relatedAnalyses: ["reliability_validity", "data_screening"],
    keywords: [
      "standards 2014",
      "psychological assessment",
      "clinical",
      "diagnosis",
      "collateral information",
      "test selection",
      "qualified user",
      "심리평가",
      "임상",
      "진단",
      "전문가"
    ],
    summary: "Psychological assessment decisions should combine appropriate test selection, standardized administration, qualified interpretation, and relevant collateral information.",
    checks: [
      "Keep this MVP non-diagnostic unless a qualified workflow and validation evidence exist.",
      "Do not infer clinical labels from score patterns alone.",
      "Route high-stakes or clinical interpretations to expert review."
    ],
    useWhen: [
      "The intended use mentions clinical, diagnosis, treatment, or individual decisions.",
      "The app produces person-level feedback."
    ]
  },
  {
    id: "standards_2014_workplace_credentialing",
    title: "Workplace and credentialing tests need job relevance and decision evidence",
    source: STANDARDS_2014_SOURCE,
    relatedAnalyses: ["measurement_invariance", "dif_screening", "reliability_validity"],
    keywords: [
      "standards 2014",
      "workplace",
      "employment",
      "hiring",
      "credentialing",
      "licensure",
      "job analysis",
      "adverse impact",
      "채용",
      "직무",
      "자격",
      "면허",
      "불리효과"
    ],
    summary: "Employment and credentialing uses require evidence that scores relate to the work or credentialing domain and that selection rules are fair, documented, and legally sensitive.",
    checks: [
      "Require job-analysis or credential-domain evidence before using scores for selection.",
      "Review adverse impact, subgroup comparability, and cut-score rationale.",
      "Do not use demo scales for hiring or certification decisions."
    ],
    useWhen: [
      "The intended use includes HR, hiring, promotion, licensing, or credentialing.",
      "Scores affect access to work or professional status."
    ]
  },
  {
    id: "standards_2014_educational_assessment",
    title: "Educational assessments need alignment among design, instruction, use, and reporting",
    source: STANDARDS_2014_SOURCE,
    relatedAnalyses: ["reliability_validity", "data_screening"],
    keywords: [
      "standards 2014",
      "educational assessment",
      "learning",
      "instruction",
      "achievement",
      "accountability",
      "reporting",
      "교육평가",
      "학업성취",
      "수업",
      "성적"
    ],
    summary: "Educational test use should align content, instruction, administration, scoring, and reports with the decisions being made for students, educators, or institutions.",
    checks: [
      "State whether the score supports formative feedback, grading, placement, or accountability.",
      "Document content alignment and administration comparability.",
      "Avoid interpreting educational scores outside the taught or sampled domain."
    ],
    useWhen: [
      "The construct or purpose is educational.",
      "Scores are used for placement, grading, school evaluation, or instructional feedback."
    ]
  },
  {
    id: "standards_2014_accountability_policy",
    title: "Program evaluation and accountability uses require careful aggregation and causal caution",
    source: STANDARDS_2014_SOURCE,
    relatedAnalyses: ["reliability_validity", "measurement_invariance", "data_screening"],
    keywords: [
      "standards 2014",
      "program evaluation",
      "policy",
      "accountability",
      "aggregate score",
      "growth",
      "index",
      "정책",
      "책무성",
      "프로그램 평가",
      "집계 점수"
    ],
    summary: "When test results inform programs, policy, or accountability, aggregation rules, subgroup effects, uncertainty, and unintended consequences should be examined explicitly.",
    checks: [
      "Specify the unit of inference: person, group, program, site, or policy.",
      "Report uncertainty and subgroup comparability for aggregated indicators.",
      "Avoid causal claims from test score changes unless the design supports them."
    ],
    useWhen: [
      "The intended use is program evaluation, policy study, or accountability.",
      "Scores are aggregated to compare groups, sites, programs, or time periods."
    ]
  }
];
