#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { createCopilotConsultation } from "../src/index.js";

const args = process.argv.slice(2);

if (args.includes("--help") || args.includes("-h")) {
  printHelp();
  process.exit(0);
}

const filePath = valueAfter("--file");
if (args.includes("--file") && !filePath) {
  console.error("Missing path after --file.");
  printHelp();
  process.exit(1);
}

const showJson = args.includes("--json") || args.includes("--raw");
const studyContext = filePath
  ? JSON.parse(await readFile(filePath, "utf8"))
  : sampleStudyContext();
const consultation = createCopilotConsultation(studyContext);

if (showJson) {
  console.log(JSON.stringify(consultation, null, 2));
} else {
  printConsultation(consultation);
}

function valueAfter(flag) {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : null;
}

function sampleStudyContext() {
  return {
    purpose: "Plan analysis for a 3-factor Likert scale study",
    construct: "Example psychosocial construct",
    intendedUse: "Research reporting and non-diagnostic feedback",
    itemType: "5-point Likert",
    responseScale: { min: 1, max: 5 },
    itemCount: 18,
    sampleSize: 320,
    expectedFactors: 3,
    groupComparison: true,
    groups: ["group_a", "group_b"],
    groupVariable: "group_id"
  };
}

function printConsultation(consultation) {
  printRule();
  console.log("Psychometrician Copilot Consultation");
  printRule();
  console.log(`Schema: ${consultation.schemaVersion}`);
  console.log(`Status: ${consultation.critic.status}`);

  printSection("Known Facts", consultation.known.map((fact) => `${fact.label}: ${fact.value}`));
  printSection("Assumptions", consultation.assumptions);
  printSection("Uncertainties", consultation.uncertain.map((item) => item.question));
  printSection("Recommended Analyses", consultation.recommendedAnalyses.map((analysis) => (
    `${analysis.priority.toUpperCase()} | ${analysis.title} (${analysis.confidence}) - ${analysis.rationale}`
  )));
  printSection("Evidence Topics", consultation.evidence.map((topic) => `${topic.title}: ${topic.summary}`));
  printSection("Code Templates", consultation.codeTemplates.map((template) => (
    `${template.title} [${template.packages.join(", ")}]`
  )));
  printSection("Critic Warnings", consultation.critic.warnings.map((warning) => (
    `${warning.severity.toUpperCase()} | ${warning.message}`
  )));
  printSection("Boundaries", consultation.agentBoundaries);

  console.log("\nUse --json to inspect the full structured DTO, including code templates.");
}

function printSection(title, rows) {
  if (!rows || rows.length === 0) {
    return;
  }
  console.log(`\n${title}`);
  for (const row of rows) {
    console.log(`- ${row}`);
  }
}

function printRule() {
  console.log("=".repeat(72));
}

function printHelp() {
  console.log([
    "Psychometrician Copilot consultation runner",
    "",
    "Usage:",
    "  npm run consult",
    "  npm run consult -- --json",
    "  npm run consult -- --file study-context.json",
    "",
    "The JSON input is a study context object with fields such as:",
    "purpose, construct, intendedUse, responseScale, itemCount, sampleSize,",
    "expectedFactors, groupComparison, groupVariable, groups, and itemIds."
  ].join("\n"));
}
