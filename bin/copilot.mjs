#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { argv, env, stdout } from "node:process";
import { createCopilotConsultation } from "../src/index.js";

const args = argv.slice(2);
const forceColor = args.includes("--color");
const noColor = args.includes("--no-color") || Object.hasOwn(env, "NO_COLOR");
const useColor = forceColor || (!noColor && stdout.isTTY);

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
  printTitle("Psychometrician Copilot");
  printOverview(consultation);
  printKnownFacts(consultation);
  printUncertainties(consultation);
  printRecommendations(consultation.recommendedAnalyses);
  printEvidence(consultation.evidence);
  printTemplates(consultation.codeTemplates);
  printWarnings(consultation.critic.warnings);
  printBoundaries(consultation.agentBoundaries);

  console.log("");
  console.log(paint("전체 JSON과 R 코드 템플릿은 아래 명령으로 확인하세요.", "muted"));
  console.log(paint("cmd /c npm run consult -- --json", "accent"));
}

function printOverview(consultation) {
  const warnings = consultation.critic.warnings;
  const errors = warnings.filter((warning) => warning.severity === "error").length;
  const flags = warnings.filter((warning) => warning.severity === "flag").length;
  const completion = completionRate(consultation);
  const statusTone = errors > 0 ? "danger" : flags > 0 ? "warning" : "success";

  console.log(card([
    line("상태", `${badge(consultation.critic.status, statusTone)}  ${errors} error · ${flags} flag`),
    line("입력 완성도", `${bar(completion, 100, 24)} ${completion}%`),
    line("추천 분석", `${consultation.recommendedAnalyses.length}개`),
    line("근거 토픽", `${consultation.evidence.length}개`),
    line("코드 템플릿", `${consultation.codeTemplates.length}개`)
  ]));
}

function printKnownFacts(consultation) {
  printSection("연구 조건");
  const rows = consultation.known.map((fact) => line(koreanFactLabel(fact.label), formatValue(fact.value)));
  console.log(card(rows));
}

function printUncertainties(consultation) {
  printSection("아직 필요한 정보");
  if (consultation.uncertain.length === 0) {
    console.log(item("필수 설계 정보가 충분히 채워졌습니다.", "success"));
    return;
  }

  for (const entry of consultation.uncertain) {
    console.log(item(entry.question, "warning"));
  }
}

function printRecommendations(analyses) {
  printSection("추천 분석 로드맵");
  analyses.forEach((analysis, index) => {
    const tone = priorityTone(analysis.priority);
    console.log(`${paint(String(index + 1).padStart(2, "0"), "muted")} ${badge(analysis.priority.toUpperCase(), tone)} ${paint(analysis.title, "strong")} ${paint(`(${analysis.confidence})`, "muted")}`);
    console.log(indent(wrap(analysis.rationale, 84), 5));
    console.log(paint(`     산출물: ${analysis.output}`, "muted"));
  });
}

function printEvidence(evidence) {
  printSection("근거 토픽");
  for (const topic of evidence.slice(0, 6)) {
    console.log(`${paint("◆", "accent")} ${paint(topic.title, "strong")}`);
    console.log(indent(wrap(topic.summary, 84), 3));
  }
}

function printTemplates(templates) {
  printSection("생성 가능한 코드");
  if (templates.length === 0) {
    console.log(item("현재 입력으로는 안전하게 생성할 코드 템플릿이 없습니다.", "warning"));
    return;
  }

  for (const template of templates) {
    const packages = template.packages.map((name) => badge(name, "neutral")).join(" ");
    console.log(`${paint("▣", "accent")} ${paint(template.title, "strong")} ${packages}`);
  }
}

function printWarnings(warnings) {
  printSection("비판자 경고");
  if (warnings.length === 0) {
    console.log(item("차단 경고가 없습니다. 그래도 전문가 검토는 필요합니다.", "success"));
    return;
  }

  for (const warning of warnings) {
    const tone = warning.severity === "error" ? "danger" : "warning";
    console.log(`${badge(warning.severity.toUpperCase(), tone)} ${warning.message}`);
  }
}

function printBoundaries(boundaries) {
  printSection("안전 경계");
  for (const boundary of boundaries) {
    console.log(item(boundary, "muted"));
  }
}

function printTitle(title) {
  console.log("");
  console.log(paint("╔" + "═".repeat(72) + "╗", "frame"));
  console.log(paint(`║${center(title, 72)}║`, "frame"));
  console.log(paint("╚" + "═".repeat(72) + "╝", "frame"));
}

function printSection(title) {
  console.log("");
  console.log(paint(`─ ${title} ${"─".repeat(Math.max(0, 68 - displayLength(title)))}`, "section"));
}

function card(lines) {
  const width = 72;
  const inner = width - 4;
  const body = lines.flatMap((text) => wrap(text, inner))
    .map((text) => {
      const pad = Math.max(0, inner - displayLength(stripAnsi(text)));
      return `${paint("│", "frame")} ${text}${" ".repeat(pad)} ${paint("│", "frame")}`;
    });

  return [
    paint("┌" + "─".repeat(width - 2) + "┐", "frame"),
    ...body,
    paint("└" + "─".repeat(width - 2) + "┘", "frame")
  ].join("\n");
}

function line(label, value) {
  return `${paint(label.padEnd(14), "muted")} ${value}`;
}

function item(text, tone = "plain") {
  return `${paint("•", tone)} ${paint(text, tone)}`;
}

function indent(lines, spaces) {
  const prefix = " ".repeat(spaces);
  return lines.map((lineText) => `${prefix}${lineText}`).join("\n");
}

function badge(text, tone) {
  return paint(`[${text}]`, tone);
}

function bar(value, max, width) {
  const ratio = max === 0 ? 0 : Math.max(0, Math.min(1, value / max));
  const filled = Math.round(ratio * width);
  return paint("█".repeat(filled), ratio >= 0.75 ? "success" : ratio >= 0.5 ? "warning" : "danger") +
    paint("░".repeat(width - filled), "barEmpty");
}

function completionRate(consultation) {
  const known = consultation.known.length;
  const unknown = consultation.uncertain.length;
  if (known + unknown === 0) {
    return 0;
  }
  return Math.round((known / (known + unknown)) * 100);
}

function koreanFactLabel(label) {
  return {
    "Research purpose": "연구 목적",
    "Construct": "구성개념",
    "Intended score use": "점수 사용",
    "Item type": "문항 유형",
    "Response scale": "응답척도",
    "Item count": "문항 수",
    "Sample size": "표본 수",
    "Expected factors": "예상 요인",
    "Groups": "집단",
    "Grouping variable": "집단 변수",
    "Group comparison needed": "집단 비교"
  }[label] ?? label;
}

function formatValue(value) {
  if (value === true) {
    return "yes";
  }
  if (value === false) {
    return "no";
  }
  return String(value);
}

function priorityTone(priority) {
  if (priority === "high") {
    return "danger";
  }
  if (priority === "medium") {
    return "warning";
  }
  return "muted";
}

function center(text, width) {
  const pad = Math.max(0, width - displayLength(text));
  const left = Math.floor(pad / 2);
  const right = pad - left;
  return `${" ".repeat(left)}${text}${" ".repeat(right)}`;
}

function wrap(text, width) {
  if (displayLength(stripAnsi(text)) <= width) {
    return [text];
  }

  const words = stripAnsi(text).split(" ");
  const lines = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (displayLength(next) <= width) {
      current = next;
      continue;
    }
    if (current) {
      lines.push(current);
    }
    current = word;
  }

  if (current) {
    lines.push(current);
  }
  return lines;
}

function paint(text, tone) {
  if (!useColor) {
    return text;
  }

  const code = {
    accent: "\x1b[36;1m",
    barEmpty: "\x1b[90m",
    danger: "\x1b[31;1m",
    frame: "\x1b[36m",
    muted: "\x1b[90m",
    neutral: "\x1b[34m",
    plain: "",
    section: "\x1b[36;1m",
    strong: "\x1b[1m",
    success: "\x1b[32;1m",
    warning: "\x1b[33;1m"
  }[tone] ?? "";

  return code ? `${code}${text}\x1b[0m` : text;
}

function stripAnsi(value) {
  return value.replace(/\x1b\[[0-9;]*m/g, "");
}

function displayLength(value) {
  return [...value].reduce((total, char) => total + charWidth(char), 0);
}

function charWidth(char) {
  const codePoint = char.codePointAt(0);
  if (
    (codePoint >= 0x1100 && codePoint <= 0x11ff) ||
    (codePoint >= 0x3130 && codePoint <= 0x318f) ||
    (codePoint >= 0xac00 && codePoint <= 0xd7af) ||
    (codePoint >= 0x4e00 && codePoint <= 0x9fff) ||
    (codePoint >= 0xff01 && codePoint <= 0xff60)
  ) {
    return 2;
  }
  return 1;
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
