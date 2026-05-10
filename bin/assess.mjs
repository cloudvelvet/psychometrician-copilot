import { readdir } from "node:fs/promises";
import { createInterface } from "node:readline/promises";
import { argv, env, stdin as input, stdout as output } from "node:process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadScale, scoreAssessment } from "../src/index.js";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const scalesDir = join(root, "scales");

const showJson = argv.includes("--json") || argv.includes("--raw");
const forceColor = argv.includes("--color");
const noColor = argv.includes("--no-color") || Object.hasOwn(env, "NO_COLOR");
const useColor = forceColor || (!noColor && output.isTTY);

const pipedAnswers = input.isTTY ? null : (await readInputStream()).split(/\r?\n/);
const rl = input.isTTY ? createInterface({ input, output }) : null;
let pipedIndex = 0;

try {
  const scaleFile = await chooseScale();
  const scale = await loadScale(join(scalesDir, scaleFile));
  const responses = await collectResponses(scale);
  const result = scoreAssessment(scale, responses);

  printResult(result, { showJson });
} finally {
  rl?.close();
}

async function ask(prompt) {
  if (rl) {
    return rl.question(prompt);
  }

  output.write(prompt);
  const answer = pipedAnswers[pipedIndex] ?? "";
  pipedIndex += 1;
  output.write(`${answer}\n`);
  return answer;
}

async function readInputStream() {
  const chunks = [];
  for await (const chunk of input) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8");
}

async function chooseScale() {
  const files = (await readdir(scalesDir))
    .filter((file) => file.endsWith(".json"))
    .sort();

  printTitle("Psychometric Engine");
  console.log(paint("검사지를 선택하세요.", "muted"));
  files.forEach((file, index) => {
    console.log(`  ${paint(String(index + 1).padStart(2), "accent")}. ${prettyScaleName(file)}`);
  });

  while (true) {
    const answer = await ask("\n번호 입력: ");
    const selected = Number(answer.trim());

    if (Number.isInteger(selected) && selected >= 1 && selected <= files.length) {
      return files[selected - 1];
    }

    console.log(paint(`1부터 ${files.length} 사이의 번호를 입력해 주세요.`, "warning"));
  }
}

async function collectResponses(scale) {
  const responses = {};
  const labels = scale.responseScale.labels ?? {};

  printTitle(scale.name);
  if (scale.notice) {
    printNotice(formatNotice(scale.notice));
  }
  console.log(`응답 범위: ${scale.responseScale.min}~${scale.responseScale.max} / 건너뛰기: Enter`);
  printLabels(labels);

  for (const [index, item] of scale.items.entries()) {
    const itemScale = item.responseScale ?? scale.responseScale;

    while (true) {
      console.log("");
      console.log(paint(`${index + 1}/${scale.items.length}`, "muted"), paint(item.id, "accent"));
      console.log(item.text ?? "(no item text)");
      const answer = await ask(`답변 (${itemScale.min}-${itemScale.max}): `);
      const trimmed = answer.trim();

      if (trimmed === "") {
        responses[item.id] = null;
        break;
      }

      const value = Number(trimmed);
      if (Number.isFinite(value) && value >= itemScale.min && value <= itemScale.max) {
        responses[item.id] = value;
        break;
      }

      console.log(paint(`${itemScale.min}부터 ${itemScale.max} 사이의 숫자를 입력하거나 Enter로 건너뛰어 주세요.`, "warning"));
    }
  }

  return responses;
}

function printLabels(labels) {
  const entries = Object.entries(labels);
  if (entries.length === 0) {
    return;
  }

  console.log("");
  console.log(paint("응답 기준", "section"));
  for (const [value, label] of entries) {
    console.log(`  ${paint(value, "accent")} ${label}`);
  }
}

function printResult(result, options = {}) {
  const scaleMax = result.scoring.responseScale.max;
  const scaleMin = result.scoring.responseScale.min;
  const projection = result.interpretationInput;

  printTitle("심리측정 결과 리포트");
  printSummaryCard(result, scaleMin, scaleMax);

  if (projection.scale.notice) {
    printNotice(formatNotice(projection.scale.notice));
  }

  if (result.validity.warnings.length > 0) {
    printSection("주의해서 볼 점");
    printList(result.validity.warnings.map(formatWarning), "warning");
  }

  printSection("하위요인 점수");
  for (const [id, subscale] of Object.entries(result.scoring.subscales)) {
    printSubscale(id, subscale, scaleMin, scaleMax);
  }

  printHighlights(projection.scores.highest, projection.scores.lowest, scaleMin, scaleMax);

  printSection("해석 가이드");
  printList([
    "이 결과는 진단이 아니라 응답 경향을 정리한 참고 자료입니다.",
    "주의 필요 상태라면 모순되거나 빠른 응답이 있었는지 다시 확인하는 편이 좋습니다.",
    "실제 서비스에는 검증되거나 라이선스가 확보된 척도를 연결해야 합니다."
  ], "muted");

  if (options.showJson) {
    printSection("AI projection JSON");
    console.log(JSON.stringify(result.interpretationInput, null, 2));
  } else {
    console.log("");
    console.log(paint("원본 AI DTO가 필요하면 `npm.cmd run assess -- --json`으로 실행하세요.", "muted"));
  }
}

function printSummaryCard(result, min, max) {
  const validity = validityMeta(result.validity.flag);
  const overall = result.scoring.overall.score;
  const answered = result.scoring.overall.answeredItems;
  const totalItems = Object.values(result.scoring.subscales)
    .reduce((total, subscale) => total + subscale.itemCount, 0);

  console.log(box([
    `${paint("검사", "muted")}  ${result.scaleName}`,
    `${paint("상태", "muted")}  ${paint(validity.label, validity.tone)} ${paint(`(${result.validity.flag})`, "muted")}`,
    `${paint("전체", "muted")}  ${formatScore(overall, min, max)}`,
    `${paint("응답", "muted")}  ${answered}/${totalItems} scored items`
  ]));
}

function printSubscale(id, subscale, min, max) {
  const band = scoreBand(subscale.score, min, max);
  const tone = bandTone(band);
  console.log(`${paint(subscale.label, "strong")} ${paint(`(${id})`, "muted")}`);
  console.log(`  ${scoreBar(subscale.score, min, max)}  ${paint(formatNumber(subscale.score), tone)}/${max}  ${paint(band, tone)}  ${paint(`응답 ${subscale.answeredItems}/${subscale.itemCount}`, "muted")}`);
}

function printHighlights(highest, lowest, min, max) {
  printSection("요약");
  if (highest.length > 0) {
    const top = highest[0];
    console.log(`가장 두드러진 영역: ${paint(top.label, "strong")} ${formatScore(top.score, min, max)}`);
  }
  if (lowest.length > 0) {
    const bottom = lowest[0];
    console.log(`상대적으로 낮은 영역: ${paint(bottom.label, "strong")} ${formatScore(bottom.score, min, max)}`);
  }
}

function formatScore(score, min, max) {
  if (score === null || score === undefined) {
    return paint("채점 보류", "warning");
  }

  const band = scoreBand(score, min, max);
  return `${paint(`${formatNumber(score)}/${max}`, bandTone(band))} ${scoreBar(score, min, max)} ${paint(band, bandTone(band))}`;
}

function scoreBar(score, min, max, width = 22) {
  if (score === null || score === undefined) {
    return paint("░".repeat(width), "muted");
  }

  const ratio = Math.max(0, Math.min(1, (score - min) / (max - min)));
  const filled = Math.round(ratio * width);
  const empty = width - filled;
  const band = scoreBand(score, min, max);
  return paint("█".repeat(filled), bandTone(band)) + paint("░".repeat(empty), "barEmpty");
}

function scoreBand(score, min, max) {
  if (score === null || score === undefined) {
    return "보류";
  }

  const range = max - min;
  const lowCutoff = min + range * 0.375;
  const highCutoff = min + range * 0.625;

  if (score < lowCutoff) {
    return "낮음";
  }
  if (score >= highCutoff) {
    return "높음";
  }
  return "보통";
}

function bandTone(band) {
  if (band === "낮음") {
    return "low";
  }
  if (band === "높음") {
    return "high";
  }
  if (band === "보류") {
    return "warning";
  }
  return "mid";
}

function validityMeta(flag) {
  if (flag === "usable") {
    return { label: "사용 가능", tone: "success" };
  }
  if (flag === "caution") {
    return { label: "주의 필요", tone: "warning" };
  }
  if (flag === "invalid") {
    return { label: "해석 보류 권장", tone: "danger" };
  }
  return { label: "알 수 없음", tone: "muted" };
}

function formatWarning(warning) {
  if (warning.startsWith("Consistency-pair inconsistency")) {
    const value = warning.match(/\(([^)]+)\)/)?.[1];
    return `응답 일관성 확인 필요: 유사하거나 반대되는 문항 일부가 서로 맞지 않습니다${value ? ` (${value})` : ""}.`;
  }
  if (warning.startsWith("Missing response rate")) {
    return warning.replace("Missing response rate", "누락 응답률");
  }
  if (warning.startsWith("Long-string response pattern")) {
    return warning.replace("Long-string response pattern", "같은 번호를 반복한 응답 패턴");
  }
  if (warning.startsWith("Response variance")) {
    return warning.replace("Response variance", "응답 분산");
  }
  if (warning.startsWith("Extreme response rate")) {
    return warning.replace("Extreme response rate", "극단 응답률");
  }
  if (warning.startsWith("Attention check failed")) {
    return warning.replace("Attention check failed", "주의문항 실패");
  }
  return warning;
}

function printNotice(message) {
  console.log("");
  console.log(box([
    paint("참고", "accent"),
    message
  ], "notice"));
}

function formatNotice(message) {
  if (message?.startsWith("Demo item bank")) {
    return "프로토타입용 데모 문항입니다. 실제 진단, 채용, 평가에는 검증되거나 라이선스가 확보된 척도를 연결하세요.";
  }
  return message;
}

function printTitle(title) {
  console.log("");
  console.log(paint("╔" + "═".repeat(58) + "╗", "frame"));
  console.log(paint(`║ ${center(title, 56)} ║`, "frame"));
  console.log(paint("╚" + "═".repeat(58) + "╝", "frame"));
}

function printSection(title) {
  console.log("");
  console.log(paint(`─ ${title} ${"─".repeat(Math.max(0, 54 - displayLength(title)))}`, "section"));
}

function printList(items, tone = "plain") {
  for (const item of items) {
    console.log(`• ${paint(item, tone)}`);
  }
}

function box(lines, tone = "frame") {
  const borderWidth = 58;
  const contentWidth = 56;
  const top = paint("┌" + "─".repeat(borderWidth) + "┐", tone);
  const bottom = paint("└" + "─".repeat(borderWidth) + "┘", tone);
  const body = lines.flatMap((line) => wrapDisplayLine(line, contentWidth))
    .map((line) => {
      const plain = stripAnsi(line);
      const pad = Math.max(0, contentWidth - displayLength(plain));
      return `${paint("│", tone)} ${line}${" ".repeat(pad)} ${paint("│", tone)}`;
    });
  return [top, ...body, bottom].join("\n");
}

function center(text, width) {
  const pad = Math.max(0, width - displayLength(text));
  const left = Math.floor(pad / 2);
  const right = pad - left;
  return `${" ".repeat(left)}${text}${" ".repeat(right)}`;
}

function prettyScaleName(file) {
  return file
    .replace(".json", "")
    .replaceAll("-", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatNumber(value) {
  if (value === null || value === undefined) {
    return "N/A";
  }
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function wrapDisplayLine(line, width) {
  if (displayLength(stripAnsi(line)) <= width) {
    return [line];
  }

  const plain = stripAnsi(line);
  const words = plain.split(" ");
  const lines = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (displayLength(candidate) <= width) {
      current = candidate;
      continue;
    }

    if (current) {
      lines.push(current);
    }

    if (displayLength(word) > width) {
      const chunks = chunkDisplayText(word, width);
      lines.push(...chunks.slice(0, -1));
      current = chunks.at(-1) ?? "";
    } else {
      current = word;
    }
  }

  if (current) {
    lines.push(current);
  }

  return lines.length > 0 ? lines : [plain];
}

function chunkDisplayText(text, width) {
  const chunks = [];
  let current = "";

  for (const char of text) {
    if (displayLength(current + char) > width) {
      chunks.push(current);
      current = char;
    } else {
      current += char;
    }
  }

  if (current) {
    chunks.push(current);
  }
  return chunks;
}

function paint(text, tone) {
  if (!useColor) {
    return text;
  }

  const code = {
    accent: "\x1b[36m",
    barEmpty: "\x1b[90m",
    danger: "\x1b[31;1m",
    frame: "\x1b[36m",
    high: "\x1b[35;1m",
    low: "\x1b[34;1m",
    mid: "\x1b[33;1m",
    muted: "\x1b[90m",
    notice: "\x1b[36m",
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
