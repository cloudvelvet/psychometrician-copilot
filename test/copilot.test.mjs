import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";
import {
  createCopilotConsultation,
  createStudyPacket,
  listKnowledgeTopics,
  retrieveKnowledge,
  validateKnowledgeTopics
} from "../src/index.js";

test("copilot recommends ordinal CFA, IRT, invariance, and DIF for a grouped Likert study", () => {
  const consultation = createCopilotConsultation({
    purpose: "Evaluate a 3-factor Likert questionnaire",
    construct: "workplace wellbeing",
    intendedUse: "research report",
    responseScale: { min: 1, max: 5 },
    itemCount: 18,
    sampleSize: 320,
    expectedFactors: 3,
    groupComparison: true,
    groups: ["women", "men"],
    groupVariable: "gender"
  });

  const ids = consultation.recommendedAnalyses.map((analysis) => analysis.id);

  assert.equal(consultation.schemaVersion, "psychometric_copilot_v1");
  assert.equal(consultation.nonDiagnostic, true);
  assert.ok(ids.includes("ordinal_cfa"));
  assert.ok(ids.includes("irt_polytomous"));
  assert.ok(ids.includes("measurement_invariance"));
  assert.ok(ids.includes("dif_screening"));
  assert.equal(consultation.context.highStakes, false);
  assert.ok(consultation.codeTemplates.some((template) => template.id === "lavaan_ordinal_cfa"));
  assert.ok(consultation.codeTemplates.some((template) => template.id === "mirt_graded_response"));
  assert.ok(consultation.evidence.some((topic) => topic.id === "ordinal_cfa"));
  assert.equal(Object.isFrozen(consultation), true);
});

test("study packet organizes a fully specified grouped Likert study", () => {
  const consultation = createCopilotConsultation({
    purpose: "Evaluate a 3-factor Likert questionnaire",
    construct: "workplace wellbeing",
    intendedUse: "research report",
    responseScale: { min: 1, max: 5 },
    itemCount: 18,
    sampleSize: 320,
    expectedFactors: 3,
    itemIds: Array.from({ length: 18 }, (_, index) => `wb_${index + 1}`),
    missingData: "Item-level missingness is under 5%.",
    distribution: "All five categories are used with no severe sparse-category issue.",
    software: ["lavaan", "semTools", "mirt", "psych"],
    groupComparison: true,
    groups: ["women", "men"],
    groupVariable: "gender"
  });

  const packet = createStudyPacket(consultation);

  assert.equal(packet.schemaVersion, "study_packet_v1");
  assert.equal(packet.deterministic, true);
  assert.equal(packet.itemFactorMap.length, 18);
  assert.equal(packet.itemFactorMap[0].item, "wb_1");
  assert.equal(packet.itemFactorMap[0].status, "확인 필요");
  assert.ok(packet.variableManifest.some((row) => row.name === "gender"));
  assert.ok(packet.analysisSequence.some((step) => step.title.includes("Measurement invariance")));
  assert.ok(!packet.missingInformation.some((item) => item.includes("Missing-data pattern")));
  assert.ok(packet.reportingChecklist.some((item) => item.includes("집단 비교")));
  assert.ok(packet.codeTemplates.some((template) => template.id === "lavaan_ordinal_cfa"));
  assert.ok(packet.boundaryChecklist.some((item) => item.includes("R 코드 실행 결과가 아닙니다")));
  assert.equal(Object.isFrozen(packet), true);
});

test("study packet marks generated item IDs and provisional mappings as templates", () => {
  const consultation = createCopilotConsultation({
    purpose: "Evaluate a 2-factor Likert questionnaire",
    responseScale: { min: 1, max: 5 },
    itemCount: 6,
    sampleSize: 180,
    expectedFactors: 2
  });

  const packet = createStudyPacket(consultation);

  assert.equal(packet.itemFactorMap[0].item, "item1");
  assert.equal(packet.itemFactorMap[0].status, "템플릿");
  assert.match(packet.itemFactorMap[0].note, /placeholder mapping/);
  assert.ok(packet.variableManifest[0].note.includes("실제 데이터 컬럼명"));
  assert.ok(packet.nextInputs.some((item) => item.includes("실제 데이터의 문항 컬럼명")));
});

test("study packet keeps under-specified requests focused on missing inputs", () => {
  const consultation = createCopilotConsultation({
    purpose: "new scale development"
  });

  const packet = createStudyPacket(consultation);

  assert.ok(packet.missingInformation.some((item) => item.includes("Sample size")));
  assert.ok(packet.missingInformation.some((item) => item.includes("Response scale")));
  assert.ok(packet.nextInputs.some((item) => item.includes("결측률")));
  assert.ok(packet.boundaryChecklist.some((item) => item.includes("연구 계획 산출물")));
});

test("copilot does not generate CFA code for impossible factor counts", () => {
  const consultation = createCopilotConsultation({
    purpose: "Evaluate a hypothesized structure",
    responseScale: { min: 1, max: 5 },
    itemCount: 2,
    sampleSize: 200,
    expectedFactors: 3
  });

  const ids = consultation.recommendedAnalyses.map((analysis) => analysis.id);

  assert.ok(!ids.includes("ordinal_cfa"));
  assert.ok(!consultation.codeTemplates.some((template) => template.id === "lavaan_ordinal_cfa"));
  assert.ok(consultation.critic.warnings.some((warning) => warning.id === "impossible_factor_count"));
});

test("copilot requires an explicit grouping variable before generating invariance code", () => {
  const consultation = createCopilotConsultation({
    purpose: "Compare groups on a 2-factor Likert questionnaire",
    responseScale: { min: 1, max: 5 },
    itemCount: 10,
    sampleSize: 240,
    expectedFactors: 2,
    groupComparison: true,
    groups: ["a", "b"]
  });

  assert.equal(consultation.context.groupVariable, null);
  assert.ok(consultation.uncertain.some((item) => item.id === "group_variable"));
  assert.ok(consultation.critic.warnings.some((warning) => warning.id === "missing_group_variable"));
  assert.ok(!consultation.codeTemplates.some((template) => template.id === "semtools_measurement_invariance"));
});

test("copilot CLI fails fast when --file has no path", () => {
  const result = spawnSync(process.execPath, ["bin/copilot.mjs", "--file"], {
    cwd: process.cwd(),
    encoding: "utf8"
  });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Missing path after --file/);
});

test("copilot keeps under-specified requests provisional and asks for design facts", () => {
  const consultation = createCopilotConsultation({
    purpose: "new scale development"
  });

  assert.ok(consultation.recommendedAnalyses.some((analysis) => analysis.id === "efa_dimensionality"));
  assert.ok(consultation.uncertain.some((item) => item.id === "sample_size"));
  assert.ok(consultation.uncertain.some((item) => item.id === "response_scale"));
  assert.equal(consultation.critic.status, "needs_review");
  assert.ok(consultation.critic.warnings.some((warning) => warning.id === "missing_design_facts"));
});

test("knowledge retrieval returns reliability cautions for alpha questions", () => {
  const hits = retrieveKnowledge("Cronbach alpha .70 reliability 신뢰도");

  assert.equal(hits[0].id, "reliability");
  assert.ok(hits[0].checks.some((check) => check.includes("alpha")));
});

test("knowledge registry is editable but structurally validated", () => {
  const topics = listKnowledgeTopics();

  assert.deepEqual(validateKnowledgeTopics(), []);
  assert.ok(topics.some((topic) => topic.id === "missing_data"));
  assert.ok(topics.some((topic) => topic.relatedAnalyses?.includes("measurement_invariance")));
});

test("2014 Standards cards are retrievable with source metadata", () => {
  const hits = retrieveKnowledge("Standards 2014 fairness DIF accommodation group comparison");

  assert.equal(hits[0].id, "standards_2014_fairness");
  assert.match(hits[0].source.citation, /AERA, APA, & NCME/);
  assert.ok(hits[0].checks.some((check) => check.includes("invariance") || check.includes("DIF")));
});

test("markdown KB topics are compiled into retrievable cards", () => {
  const topics = listKnowledgeTopics();
  const hits = retrieveKnowledge("Mantel-Haenszel DIF focal reference group 만텔 헨젤");

  assert.ok(topics.some((topic) => topic.id === "kb_ordinal_cfa"));
  assert.equal(hits[0].id, "kb_mantel_haenszel_dif");
  assert.match(hits[0].source.path, /psychometrics_kb\/dif\/mantel_haenszel.md/);
});

test("Korean SEM book notes are retrievable with citation metadata", () => {
  const hits = retrieveKnowledge("문항묶음 parceling 구조방정식 단일차원성");

  assert.equal(hits[0].id, "kb_sem_item_parcels");
  assert.match(hits[0].source.citation, /김수영 \(2016\)/);
});

test("Mplus SEM book note is retrievable", () => {
  const hits = retrieveKnowledge("Mplus syntax categorical missing estimator 구조방정식");

  assert.equal(hits[0].id, "kb_mplus_sem_templates");
});
