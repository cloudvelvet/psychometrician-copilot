import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";
import {
  createCopilotConsultation,
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
