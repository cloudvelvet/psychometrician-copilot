import { createCopilotConsultation } from "../src/copilot.js";
import { cronbachAlpha } from "../src/reliability.js";
import { scoreAssessment } from "../src/score.js";
import { createStudyPacket } from "../src/study-packet.js";

const SCALE_FILES = [
  "affect-state-demo.json",
  "big-five-demo.json",
  "burnout-brief-demo.json",
  "job-fit-demo.json",
  "stress-brief-demo.json"
];

const SAMPLE_CONTEXT = {
  purpose: "Validate an 18-item, 3-factor Likert questionnaire and prepare group-comparison checks.",
  construct: "workplace wellbeing",
  intendedUse: "research reporting and non-diagnostic feedback",
  itemType: "5-point Likert",
  responseScale: { min: 1, max: 5 },
  itemCount: 18,
  sampleSize: 320,
  expectedFactors: 3,
  groupComparison: true,
  groupVariable: "gender",
  groups: ["female", "male"],
  itemIds: [
    "wb_1", "wb_2", "wb_3", "wb_4", "wb_5", "wb_6",
    "stress_1", "stress_2", "stress_3", "stress_4", "stress_5", "stress_6",
    "belonging_1", "belonging_2", "belonging_3", "belonging_4", "belonging_5", "belonging_6"
  ],
  missingData: "Initial screening expects item-level missingness under 5%; cases above 20% missing will be reviewed before modeling.",
  distribution: "Five response categories are expected; sparse categories and skew will be checked before choosing ordinal CFA estimation.",
  software: ["lavaan", "semTools", "mirt", "psych"],
  highStakes: false
};

const state = {
  mode: "consult",
  scale: null,
  responses: {},
  upload: {
    fileName: null,
    headers: [],
    rows: [],
    mappings: []
  }
};

const nodes = {
  assessmentForm: document.querySelector("#assessmentForm"),
  analyzeDataButton: document.querySelector("#analyzeDataButton"),
  clearDataButton: document.querySelector("#clearDataButton"),
  consultForm: document.querySelector("#consultForm"),
  constructInput: document.querySelector("#constructInput"),
  consultCoach: document.querySelector("#consultCoach"),
  dataFileInput: document.querySelector("#dataFileInput"),
  dataMappingPanel: document.querySelector("#dataMappingPanel"),
  distributionInput: document.querySelector("#distributionInput"),
  expectedFactorsInput: document.querySelector("#expectedFactorsInput"),
  groupComparisonInput: document.querySelector("#groupComparisonInput"),
  groupsInput: document.querySelector("#groupsInput"),
  groupVariableInput: document.querySelector("#groupVariableInput"),
  highStakesInput: document.querySelector("#highStakesInput"),
  intendedUseInput: document.querySelector("#intendedUseInput"),
  itemCountInput: document.querySelector("#itemCountInput"),
  itemIdsInput: document.querySelector("#itemIdsInput"),
  itemTypeInput: document.querySelector("#itemTypeInput"),
  missingDataInput: document.querySelector("#missingDataInput"),
  progressBar: document.querySelector("#progressBar"),
  progressText: document.querySelector("#progressText"),
  purposeInput: document.querySelector("#purposeInput"),
  resetButton: document.querySelector("#resetButton"),
  resultPanel: document.querySelector("#resultPanel"),
  sampleConsultButton: document.querySelector("#sampleConsultButton"),
  sampleDataButton: document.querySelector("#sampleDataButton"),
  sampleSizeInput: document.querySelector("#sampleSizeInput"),
  scaleMaxInput: document.querySelector("#scaleMaxInput"),
  scaleMeta: document.querySelector("#scaleMeta"),
  scaleMinInput: document.querySelector("#scaleMinInput"),
  scaleSelect: document.querySelector("#scaleSelect"),
  scaleTitle: document.querySelector("#scaleTitle"),
  scoreButton: document.querySelector("#scoreButton"),
  softwareInput: document.querySelector("#softwareInput"),
  tabButtons: [...document.querySelectorAll(".tab-button")],
  uploadGroupSelect: document.querySelector("#uploadGroupSelect"),
  uploadMappingList: document.querySelector("#uploadMappingList"),
  uploadScaleMaxInput: document.querySelector("#uploadScaleMaxInput"),
  uploadScaleMinInput: document.querySelector("#uploadScaleMinInput"),
  uploadScoreMethodInput: document.querySelector("#uploadScoreMethodInput"),
  uploadSummary: document.querySelector("#uploadSummary")
};

init().catch((error) => {
  nodes.resultPanel.innerHTML = renderMessage({
    title: "앱을 불러오지 못했습니다",
    body: error.message,
    tone: "danger"
  });
});

async function init() {
  wireTabs();
  wireConsultation();
  wireAssessment();
  wireUpload();
  wireResultPanel();
  fillConsultationForm(SAMPLE_CONTEXT);
  renderConsultation();
  await loadScaleList();
}

function wireTabs() {
  for (const button of nodes.tabButtons) {
    button.addEventListener("click", () => setMode(button.dataset.mode));
  }
}

function setMode(mode) {
  state.mode = mode;
  document.querySelectorAll(".mode-panel").forEach((panel) => {
    panel.classList.toggle("active", panel.id === `${mode}Mode`);
  });
  nodes.tabButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.mode === mode);
  });

  if (mode === "consult") {
    renderConsultation();
  } else if (mode === "score" && state.scale) {
    renderEmptyScoreState();
  } else if (mode === "upload") {
    renderUploadEmptyState();
  }
}

function wireConsultation() {
  nodes.sampleConsultButton.addEventListener("click", () => {
    fillConsultationForm(SAMPLE_CONTEXT);
    renderConsultation();
  });

  nodes.consultForm.addEventListener("input", () => {
    renderConsultationCoach(createCopilotConsultation(readConsultationForm()));
  });

  nodes.consultForm.addEventListener("change", () => {
    renderConsultationCoach(createCopilotConsultation(readConsultationForm()));
  });

  nodes.consultForm.addEventListener("submit", (event) => {
    event.preventDefault();
    renderConsultation();
    focusResultPanel();
  });

  nodes.groupComparisonInput.addEventListener("change", () => {
    nodes.groupVariableInput.disabled = !nodes.groupComparisonInput.checked;
    nodes.groupsInput.disabled = !nodes.groupComparisonInput.checked;
    renderConsultationCoach(createCopilotConsultation(readConsultationForm()));
  });
}

function wireAssessment() {
  nodes.scaleSelect.addEventListener("change", () => loadSelectedScale());
  nodes.resetButton.addEventListener("click", () => resetResponses());
  nodes.scoreButton.addEventListener("click", () => {
    renderScoreResult();
    focusResultPanel();
  });
  nodes.assessmentForm.addEventListener("change", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) {
      return;
    }
    state.responses[target.name] = Number(target.value);
    updateProgress();
  });
}

function wireUpload() {
  nodes.dataFileInput.addEventListener("change", async () => {
    const file = nodes.dataFileInput.files?.[0];
    if (!file) {
      return;
    }
    await loadUploadedFile(file);
  });

  nodes.sampleDataButton.addEventListener("click", () => {
    loadUploadedDataset({
      fileName: "sample-likert-data.csv",
      headers: ["respondent_id", "group_id", "wb_1", "wb_2", "wb_3_r", "stress_1", "stress_2_r", "stress_3"],
      rows: buildSampleDataset()
    });
    setMode("upload");
  });

  nodes.clearDataButton.addEventListener("click", () => resetUploadState());
  nodes.analyzeDataButton.addEventListener("click", () => {
    renderUploadReport();
    focusResultPanel();
  });
  nodes.uploadMappingList.addEventListener("input", syncUploadMappingsFromUi);
  nodes.uploadMappingList.addEventListener("change", syncUploadMappingsFromUi);
}

function wireResultPanel() {
  nodes.resultPanel.addEventListener("click", async (event) => {
    if (!(event.target instanceof Element)) {
      return;
    }
    const button = event.target.closest("[data-report-action]");
    if (!(button instanceof HTMLButtonElement)) {
      return;
    }

    await handleReportAction(button);
  });
}

async function handleReportAction(button) {
  const action = button.dataset.reportAction;
  if (action === "copy_brief") {
    await copyReportBrief(button);
    return;
  }
  if (action === "copy_packet") {
    await copyStudyPacket(button);
    return;
  }
  if (action === "jump_to_packet") {
    scrollToReportSection(".study-packet");
    return;
  }
  if (action === "jump_to_evidence") {
    scrollToReportSection(".evidence-grid");
    return;
  }
  if (action === "review_flags") {
    scrollToReportSection(".warning-surface, .warning-list");
    return;
  }
  if (action === "export_report") {
    window.print();
    return;
  }
  if (action === "edit_inputs") {
    setMode("consult");
    document.querySelector("#consultMode")?.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }
  if (action === "focus_field") {
    focusConsultField(button.dataset.fieldTarget);
    return;
  }
  if (action === "edit_answers") {
    setMode("score");
    document.querySelector("#scoreMode")?.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }
  if (action === "edit_upload") {
    setMode("upload");
    document.querySelector("#uploadMode")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function focusConsultField(fieldId) {
  setMode("consult");
  const target = fieldId ? document.getElementById(fieldId) : null;
  if (target instanceof HTMLElement) {
    target.scrollIntoView({ behavior: "smooth", block: "center" });
    window.setTimeout(() => target.focus(), 250);
    return;
  }
  document.querySelector("#consultMode")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function copyReportBrief(button) {
  await copyReportSection(button, ".report-hero");
}

async function copyStudyPacket(button) {
  await copyReportSection(button, ".study-packet");
}

async function copyReportSection(button, selector) {
  const originalLabel = button.textContent;
  const text = nodes.resultPanel.querySelector(selector)?.textContent?.trim() ?? "";
  try {
    await navigator.clipboard.writeText(text);
    button.textContent = "복사됨";
  } catch {
    button.textContent = "복사 실패";
  } finally {
    window.setTimeout(() => {
      button.textContent = originalLabel;
    }, 1200);
  }
}

function scrollToReportSection(selector) {
  const target = nodes.resultPanel.querySelector(selector)?.closest(".result-section") ??
    nodes.resultPanel.querySelector(selector);
  target?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function focusResultPanel() {
  if (window.matchMedia("(max-width: 1260px)").matches) {
    nodes.resultPanel.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

async function loadScaleList() {
  nodes.scaleSelect.innerHTML = SCALE_FILES
    .map((file) => `<option value="${file}">${formatScaleName(file)}</option>`)
    .join("");

  await loadSelectedScale();
}

async function loadSelectedScale() {
  const file = nodes.scaleSelect.value || SCALE_FILES[0];
  const response = await fetch(new URL(`../scales/${file}`, import.meta.url));
  if (!response.ok) {
    throw new Error(`Scale fetch failed: ${response.status}`);
  }

  state.scale = await response.json();
  state.responses = {};
  renderScale();
  updateProgress();
  if (state.mode === "score") {
    renderEmptyScoreState();
  }
}

async function loadUploadedFile(file) {
  try {
    const parsed = await parseUploadedFile(file);
    loadUploadedDataset({
      fileName: file.name,
      headers: parsed.headers,
      rows: parsed.rows
    });
  } catch (error) {
    nodes.uploadSummary.innerHTML = `
      <strong>파일을 읽지 못했습니다.</strong>
      <p>${escapeHtml(error.message)}</p>
    `;
    nodes.dataMappingPanel.hidden = true;
    nodes.resultPanel.innerHTML = renderMessage({
      title: "업로드 실패",
      body: error.message,
      tone: "danger"
    });
  }
}

function loadUploadedDataset({ fileName, headers, rows }) {
  const cleanHeaders = uniquifyHeaders(headers.map((header) => String(header ?? "").trim()));
  const cleanRows = rows
    .map((row) => normalizeUploadedRow(row, cleanHeaders))
    .filter((row) => cleanHeaders.some((header) => String(row[header] ?? "").trim() !== ""));

  if (cleanHeaders.length === 0 || cleanRows.length === 0) {
    throw new Error("헤더와 데이터 행이 있는 파일을 올려주세요.");
  }

  state.upload = {
    fileName,
    headers: cleanHeaders,
    rows: cleanRows,
    mappings: inferUploadMappings(cleanHeaders, cleanRows)
  };

  renderUploadMapping();
  renderUploadEmptyState();
}

function resetUploadState() {
  state.upload = {
    fileName: null,
    headers: [],
    rows: [],
    mappings: []
  };
  nodes.dataFileInput.value = "";
  nodes.dataMappingPanel.hidden = true;
  nodes.uploadSummary.innerHTML = `
    <strong>아직 불러온 데이터가 없습니다.</strong>
    <p>파일을 선택하면 컬럼 매핑 표가 여기에 표시됩니다.</p>
  `;
  renderUploadEmptyState();
}

function renderUploadMapping() {
  const { fileName, headers, rows, mappings } = state.upload;
  nodes.uploadSummary.innerHTML = `
    <strong>${escapeHtml(fileName ?? "uploaded data")}</strong>
    <p>${rows.length}명 · ${headers.length}개 컬럼을 브라우저에서 읽었습니다. 선택한 문항만 채점에 사용됩니다.</p>
  `;
  nodes.dataMappingPanel.hidden = false;
  nodes.uploadGroupSelect.innerHTML = `
    <option value="">집단 변수 없음</option>
    ${headers.map((header) => `<option value="${escapeHtml(header)}">${escapeHtml(header)}</option>`).join("")}
  `;
  const inferredGroup = headers.find((header) => /group|gender|sex|condition|class|집단|성별/i.test(header));
  nodes.uploadGroupSelect.value = inferredGroup ?? "";

  nodes.uploadMappingList.innerHTML = mappings.map((mapping, index) => `
    <article class="mapping-row" data-index="${index}">
      <label class="switch mapping-include">
        <input type="checkbox" data-field="include" ${mapping.include ? "checked" : ""}>
        <span>${escapeHtml(mapping.column)}</span>
      </label>
      <label>
        <span>요인</span>
        <input type="text" data-field="factor" value="${escapeHtml(mapping.factor)}" placeholder="예: factor_1">
      </label>
      <label class="switch">
        <input type="checkbox" data-field="reverse" ${mapping.reverse ? "checked" : ""}>
        <span>역채점</span>
      </label>
      <span class="data-pill">${mapping.numericRate}% numeric</span>
    </article>
  `).join("");
}

function syncUploadMappingsFromUi() {
  state.upload.mappings = [...nodes.uploadMappingList.querySelectorAll(".mapping-row")].map((row) => {
    const index = Number(row.dataset.index);
    const previous = state.upload.mappings[index];
    return {
      ...previous,
      include: row.querySelector('[data-field="include"]')?.checked ?? false,
      reverse: row.querySelector('[data-field="reverse"]')?.checked ?? false,
      factor: row.querySelector('[data-field="factor"]')?.value.trim() || previous.factor
    };
  });
}

function renderUploadEmptyState() {
  if (state.upload.rows.length > 0) {
    nodes.resultPanel.innerHTML = renderMessage({
      title: "데이터 매핑을 확인하세요",
      body: "문항 컬럼, 역채점, 요인명, 집단 변수를 확인한 뒤 데이터 리포트 보기를 누르면 코호트 요약이 오른쪽에 표시됩니다.",
      tone: "neutral"
    });
    return;
  }

  nodes.resultPanel.innerHTML = renderMessage({
    title: "업로드 데이터가 없습니다",
    body: "CSV, TSV, TXT, XLSX 파일을 선택하면 데이터는 서버로 전송되지 않고 브라우저 안에서만 분석됩니다.",
    tone: "neutral"
  });
}

async function parseUploadedFile(file) {
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (extension === "xlsx") {
    return parseXlsxFile(await file.arrayBuffer());
  }
  const text = await file.text();
  return parseDelimitedText(text);
}

function parseDelimitedText(text) {
  const rows = parseDelimitedRows(stripBom(text), detectDelimiter(text));
  if (rows.length < 2) {
    throw new Error("최소 헤더 1행과 데이터 1행이 필요합니다.");
  }
  const headers = uniquifyHeaders(rows[0].map((value) => String(value ?? "").trim()));
  const body = rows.slice(1).map((row) => Object.fromEntries(headers.map((header, index) => [
    header,
    row[index] ?? ""
  ])));
  return { headers, rows: body };
}

function parseDelimitedRows(text, delimiter) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        cell += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && char === delimiter) {
      row.push(cell);
      cell = "";
      continue;
    }

    if (!inQuotes && (char === "\n" || char === "\r")) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }
      row.push(cell);
      if (row.some((value) => value !== "")) {
        rows.push(row);
      }
      row = [];
      cell = "";
      continue;
    }

    cell += char;
  }

  row.push(cell);
  if (row.some((value) => value !== "")) {
    rows.push(row);
  }
  return rows;
}

function detectDelimiter(text) {
  const sample = stripBom(text).split(/\r?\n/).slice(0, 10).join("\n");
  const candidates = [",", "\t", ";"];
  return candidates
    .map((delimiter) => ({
      delimiter,
      count: [...sample].filter((char) => char === delimiter).length
    }))
    .sort((a, b) => b.count - a.count)[0]?.delimiter ?? ",";
}

async function parseXlsxFile(buffer) {
  const entries = await readZipEntries(buffer);
  const workbook = parseXml(await readZipText(entries, "xl/workbook.xml"));
  const rels = parseXml(await readZipText(entries, "xl/_rels/workbook.xml.rels"));
  const sheet = workbook.querySelector("sheet");
  const relationId = sheet?.getAttribute("r:id");
  if (!relationId) {
    throw new Error("XLSX 첫 시트를 찾지 못했습니다.");
  }

  const relationship = [...rels.querySelectorAll("Relationship")]
    .find((rel) => rel.getAttribute("Id") === relationId);
  const target = relationship?.getAttribute("Target");
  if (!target) {
    throw new Error("XLSX 시트 관계 정보를 읽지 못했습니다.");
  }

  const worksheetPath = normalizeXlsxPath(target);
  const sharedStrings = entries.has("xl/sharedStrings.xml")
    ? parseSharedStrings(parseXml(await readZipText(entries, "xl/sharedStrings.xml")))
    : [];
  const worksheet = parseXml(await readZipText(entries, worksheetPath));
  return parseWorksheetXml(worksheet, sharedStrings);
}

async function readZipEntries(buffer) {
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);
  const eocdOffset = findEndOfCentralDirectory(view);
  const recordCount = view.getUint16(eocdOffset + 10, true);
  let offset = view.getUint32(eocdOffset + 16, true);
  const entries = new Map();

  for (let index = 0; index < recordCount; index += 1) {
    if (view.getUint32(offset, true) !== 0x02014b50) {
      throw new Error("XLSX ZIP 중앙 디렉터리를 읽지 못했습니다.");
    }
    const method = view.getUint16(offset + 10, true);
    const compressedSize = view.getUint32(offset + 20, true);
    const fileNameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const localHeaderOffset = view.getUint32(offset + 42, true);
    const fileName = decodeUtf8(bytes.slice(offset + 46, offset + 46 + fileNameLength));
    const localNameLength = view.getUint16(localHeaderOffset + 26, true);
    const localExtraLength = view.getUint16(localHeaderOffset + 28, true);
    const dataStart = localHeaderOffset + 30 + localNameLength + localExtraLength;
    const compressed = bytes.slice(dataStart, dataStart + compressedSize);
    entries.set(fileName.replaceAll("\\", "/"), {
      method,
      compressed
    });
    offset += 46 + fileNameLength + extraLength + commentLength;
  }

  const inflated = new Map();
  for (const [name, entry] of entries) {
    inflated.set(name, await inflateZipEntry(entry));
  }
  return inflated;
}

function findEndOfCentralDirectory(view) {
  const minOffset = Math.max(0, view.byteLength - 65557);
  for (let offset = view.byteLength - 22; offset >= minOffset; offset -= 1) {
    if (view.getUint32(offset, true) === 0x06054b50) {
      return offset;
    }
  }
  throw new Error("XLSX ZIP 구조를 찾지 못했습니다.");
}

async function inflateZipEntry(entry) {
  if (entry.method === 0) {
    return entry.compressed;
  }
  if (entry.method !== 8) {
    throw new Error("지원하지 않는 XLSX 압축 방식입니다.");
  }
  if (!("DecompressionStream" in window)) {
    throw new Error("이 브라우저는 XLSX 압축 해제를 지원하지 않습니다. CSV로 저장해서 올려주세요.");
  }
  const stream = new Blob([entry.compressed]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function readZipText(entries, path) {
  const bytes = entries.get(path);
  if (!bytes) {
    throw new Error(`${path} 파일을 XLSX 안에서 찾지 못했습니다.`);
  }
  return decodeUtf8(bytes);
}

function parseXml(text) {
  const document = new DOMParser().parseFromString(text, "application/xml");
  if (document.querySelector("parsererror")) {
    throw new Error("XLSX XML을 읽지 못했습니다.");
  }
  return document;
}

function parseSharedStrings(document) {
  return [...document.querySelectorAll("si")].map((item) => (
    [...item.querySelectorAll("t")].map((node) => node.textContent ?? "").join("")
  ));
}

function parseWorksheetXml(document, sharedStrings) {
  const grid = [];
  for (const cell of document.querySelectorAll("sheetData c")) {
    const reference = cell.getAttribute("r") ?? "";
    const { rowIndex, columnIndex } = parseCellReference(reference);
    if (rowIndex < 0 || columnIndex < 0) {
      continue;
    }
    grid[rowIndex] ??= [];
    grid[rowIndex][columnIndex] = readCellValue(cell, sharedStrings);
  }

  const rows = grid
    .filter(Boolean)
    .map((row) => row.map((value) => value ?? ""));
  if (rows.length < 2) {
    throw new Error("XLSX 첫 시트에 헤더와 데이터 행이 필요합니다.");
  }
  const headers = uniquifyHeaders(rows[0].map((value) => String(value ?? "").trim()));
  const body = rows.slice(1).map((row) => Object.fromEntries(headers.map((header, index) => [
    header,
    row[index] ?? ""
  ])));
  return { headers, rows: body };
}

function readCellValue(cell, sharedStrings) {
  const type = cell.getAttribute("t");
  if (type === "inlineStr") {
    return [...cell.querySelectorAll("is t")].map((node) => node.textContent ?? "").join("");
  }
  const value = cell.querySelector("v")?.textContent ?? "";
  if (type === "s") {
    return sharedStrings[Number(value)] ?? "";
  }
  if (type === "b") {
    return value === "1" ? "TRUE" : "FALSE";
  }
  return value;
}

function parseCellReference(reference) {
  const match = reference.match(/^([A-Z]+)(\d+)$/i);
  if (!match) {
    return { rowIndex: -1, columnIndex: -1 };
  }
  const columnIndex = [...match[1].toUpperCase()].reduce((total, char) => (
    total * 26 + char.charCodeAt(0) - 64
  ), 0) - 1;
  return {
    rowIndex: Number(match[2]) - 1,
    columnIndex
  };
}

function normalizeXlsxPath(target) {
  const path = target.replace(/^\/+/, "");
  return path.startsWith("xl/") ? path : `xl/${path}`;
}

function inferUploadMappings(headers, rows) {
  return headers.map((header) => {
    const values = rows.map((row) => row[header]);
    const numericRate = Math.round(numericValues(values).length / Math.max(1, values.filter((value) => value !== "").length) * 100);
    const include = numericRate >= 80 && !/(^id$|respondent|participant|group|gender|sex|name|date|time|집단|성별|이름)/i.test(header);
    return {
      column: header,
      include,
      reverse: /(_r$|_rev$|reverse|역)/i.test(header),
      factor: inferFactorName(header),
      numericRate
    };
  });
}

function inferFactorName(header) {
  const cleaned = header.replace(/(_r|_rev|reverse|역)$/i, "");
  const match = cleaned.match(/^([A-Za-z가-힣]+)[_-]?\d+$/);
  if (match) {
    return match[1];
  }
  return cleaned.includes("_") ? cleaned.split("_")[0] : "total";
}

function normalizeUploadedRow(row, headers) {
  if (Array.isArray(row)) {
    return Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ""]));
  }
  return Object.fromEntries(headers.map((header) => [header, row[header] ?? ""]));
}

function uniquifyHeaders(headers) {
  const counts = new Map();
  return headers.map((header, index) => {
    const base = header || `column_${index + 1}`;
    const count = counts.get(base) ?? 0;
    counts.set(base, count + 1);
    return count === 0 ? base : `${base}_${count + 1}`;
  });
}

function buildSampleDataset() {
  return Array.from({ length: 24 }, (_, index) => ({
    respondent_id: `R${String(index + 1).padStart(2, "0")}`,
    group_id: index % 2 === 0 ? "group_a" : "group_b",
    wb_1: 3 + (index % 3),
    wb_2: 2 + (index % 4),
    wb_3_r: 1 + (index % 5),
    stress_1: 2 + (index % 3),
    stress_2_r: 1 + ((index + 2) % 5),
    stress_3: 3 + ((index + 1) % 3)
  }));
}

function stripBom(text) {
  return text.replace(/^\uFEFF/, "");
}

function decodeUtf8(bytes) {
  return new TextDecoder("utf-8").decode(bytes);
}

function fillConsultationForm(context) {
  nodes.purposeInput.value = context.purpose ?? "";
  nodes.constructInput.value = context.construct ?? "";
  nodes.intendedUseInput.value = context.intendedUse ?? "";
  nodes.itemTypeInput.value = context.itemType ?? "5-point Likert";
  nodes.scaleMinInput.value = context.responseScale?.min ?? 1;
  nodes.scaleMaxInput.value = context.responseScale?.max ?? 5;
  nodes.itemCountInput.value = context.itemCount ?? "";
  nodes.sampleSizeInput.value = context.sampleSize ?? "";
  nodes.expectedFactorsInput.value = context.expectedFactors ?? "";
  nodes.groupComparisonInput.checked = Boolean(context.groupComparison);
  nodes.groupVariableInput.value = context.groupVariable ?? "";
  nodes.groupsInput.value = Array.isArray(context.groups) ? context.groups.join(", ") : "";
  nodes.itemIdsInput.value = Array.isArray(context.itemIds) ? context.itemIds.join(", ") : "";
  nodes.missingDataInput.value = context.missingData ?? "";
  nodes.distributionInput.value = context.distribution ?? "";
  nodes.softwareInput.value = Array.isArray(context.software) ? context.software.join(", ") : "";
  nodes.highStakesInput.checked = Boolean(context.highStakes);
  nodes.groupVariableInput.disabled = !nodes.groupComparisonInput.checked;
  nodes.groupsInput.disabled = !nodes.groupComparisonInput.checked;
}

function readConsultationForm() {
  const min = numberOrNull(nodes.scaleMinInput.value);
  const max = numberOrNull(nodes.scaleMaxInput.value);
  const itemIds = splitList(nodes.itemIdsInput.value);
  const software = splitList(nodes.softwareInput.value);
  return {
    purpose: nodes.purposeInput.value,
    construct: nodes.constructInput.value,
    intendedUse: nodes.intendedUseInput.value,
    itemType: nodes.itemTypeInput.value,
    responseScale: min !== null && max !== null ? { min, max } : null,
    itemCount: numberOrNull(nodes.itemCountInput.value),
    sampleSize: numberOrNull(nodes.sampleSizeInput.value),
    expectedFactors: numberOrNull(nodes.expectedFactorsInput.value),
    itemIds: itemIds.length > 0 ? itemIds : undefined,
    missingData: nodes.missingDataInput.value,
    distribution: nodes.distributionInput.value,
    groupComparison: nodes.groupComparisonInput.checked,
    groupVariable: nodes.groupComparisonInput.checked ? nodes.groupVariableInput.value : "",
    groups: nodes.groupComparisonInput.checked ? splitList(nodes.groupsInput.value) : [],
    software: software.length > 0 ? software : undefined,
    highStakes: nodes.highStakesInput.checked
  };
}

function renderConsultation() {
  const consultation = createCopilotConsultation(readConsultationForm());
  const warnings = consultation.critic.warnings;
  const errors = warnings.filter((warning) => warning.severity === "error").length;
  const flags = warnings.filter((warning) => warning.severity === "flag").length;
  const completion = completionRate(consultation);
  renderConsultationCoach(consultation);

  nodes.resultPanel.innerHTML = `
    <article class="result-stack">
      <header class="result-heading">
        <div>
          <p class="eyebrow">Consultation Report</p>
          <h2>분석 상담 결과</h2>
        </div>
        <span class="status-pill ${errors > 0 ? "danger" : flags > 0 ? "warning" : "success"}">
          ${escapeHtml(consultation.critic.status)}
        </span>
      </header>

      ${renderReportToolbar([
        { label: "요약 복사", action: "copy_brief" },
        { label: "패킷 보기", action: "jump_to_packet" },
        { label: "패킷 복사", action: "copy_packet" },
        { label: "근거 보기", action: "jump_to_evidence" },
        { label: "PDF 저장", action: "export_report" },
        { label: "입력 수정", action: "edit_inputs" }
      ])}

      ${renderConsultationBrief(consultation, { completion, errors, flags })}
      ${renderConsultationDecisionBoard(consultation)}
      ${renderConsultationPipeline(consultation.recommendedAnalyses)}
      ${renderConsultationChat(consultation)}
      ${renderStudyPacket(consultation)}
      ${renderWarnings(consultation.critic.warnings)}
      ${renderEvidenceTopics(consultation.evidence)}
    </article>
  `;
}

function renderConsultationCoach(consultation) {
  const coach = buildConsultationCoach(consultation);
  nodes.consultCoach.innerHTML = `
    <div class="intake-coach-header">
      <div>
        <p class="eyebrow">Intake Coach</p>
        <h3>${escapeHtml(coach.title)}</h3>
        <p>${escapeHtml(coach.summary)}</p>
      </div>
      <div class="coach-score ${escapeHtml(coach.state)}">
        <span>Readiness</span>
        <strong>${coach.completion}%</strong>
        ${renderBar(coach.completion)}
      </div>
    </div>
    <div class="coach-grid">
      <article class="coach-card next">
        <span>다음 입력</span>
        <strong>${escapeHtml(coach.nextInput.title)}</strong>
        <p>${escapeHtml(coach.nextInput.body)}</p>
      </article>
      <article class="coach-card">
        <span>상담 상태</span>
        <strong>${escapeHtml(coach.statusLabel)}</strong>
        <p>${escapeHtml(coach.statusBody)}</p>
      </article>
    </div>
    <div class="coach-chip-list">
      ${coach.chips.map((chip) => `<span class="${escapeHtml(chip.className)}">${escapeHtml(chip.label)}</span>`).join("")}
    </div>
  `;
}

function buildConsultationCoach(consultation) {
  const completion = completionRate(consultation);
  const errors = consultation.critic.warnings.filter((warning) => warning.severity === "error");
  const missing = consultation.uncertain;
  const context = consultation.context;
  const state = errors.length > 0 ? "danger" : missing.length > 0 ? "warning" : "success";
  const nextInput = nextConsultationInput(consultation);
  const chips = [
    {
      label: context.itemIdsGenerated ? "문항 컬럼 placeholder" : "문항 컬럼 확인됨",
      className: context.itemIdsGenerated ? "coach-chip warning" : "coach-chip success"
    },
    {
      label: context.missingData ? "결측 정보 있음" : "결측 정보 필요",
      className: context.missingData ? "coach-chip success" : "coach-chip warning"
    },
    {
      label: context.distribution ? "범주 분포 있음" : "범주 분포 필요",
      className: context.distribution ? "coach-chip success" : "coach-chip warning"
    },
    {
      label: context.groupComparison
        ? context.groupVariableProvided ? "집단 비교 준비 중" : "집단 변수 필요"
        : "집단 비교 제외",
      className: context.groupComparison && !context.groupVariableProvided ? "coach-chip danger" : "coach-chip"
    }
  ];

  if (context.highStakes) {
    chips.push({
      label: "고위험 사용: 별도 검토",
      className: "coach-chip danger"
    });
  }

  return {
    completion,
    state,
    title: state === "danger" ? "분석 전 차단 조건이 있습니다" : state === "warning" ? "몇 가지 설계 정보가 더 필요합니다" : "상담 입력이 꽤 단단합니다",
    summary: "오른쪽 리포트는 제출 시 갱신되고, 이 코치는 입력 중인 설계의 빈칸과 위험 신호를 즉시 정리합니다.",
    statusLabel: errors.length > 0 ? `${errors.length}개 차단 경고` : missing.length > 0 ? `${missing.length}개 누락 정보` : "전문가 검토 준비",
    statusBody: errors[0]?.message ?? missing[0]?.question ?? "이제 오른쪽 리포트를 갱신해 연구 패킷과 코드 템플릿을 확인하세요.",
    nextInput,
    chips
  };
}

function nextConsultationInput(consultation) {
  const context = consultation.context;
  if (consultation.critic.nextQuestions.length > 0) {
    return {
      title: consultation.critic.nextQuestions[0],
      body: "이 정보를 입력하면 추천 분석과 연구 패킷의 provisional 문구가 줄어듭니다."
    };
  }
  if (context.itemIdsGenerated) {
    return {
      title: "실제 문항 컬럼명을 넣으세요",
      body: "item1, item2 placeholder 대신 실제 데이터 컬럼명이 들어가면 연구 패킷의 매핑표가 더 바로 쓸 수 있게 됩니다."
    };
  }
  return {
    title: "오른쪽 리포트 갱신",
    body: "현재 입력으로 분석 로드맵, 연구 패킷, R 템플릿을 다시 생성할 수 있습니다."
  };
}

function renderConsultationBrief(consultation, { completion, errors, flags }) {
  const primary = consultation.recommendedAnalyses[0];
  const missing = consultation.uncertain.length;
  const codeCount = consultation.codeTemplates.length;
  const verdict = errors > 0
    ? "분석 전 차단 조건 해결"
    : flags > 0
      ? "잠정 계획: 전문가 검토 필요"
      : "연구 패킷 검토 단계";
  const summary = primary
    ? `현재 입력에서는 ${primary.title}을 출발점으로 잡고, 데이터 스크리닝과 측정모형 확인을 순서대로 묶는 계획이 가장 안전합니다.`
    : "현재 입력만으로는 추천 분석을 확정하기 어렵습니다. 핵심 설계 정보를 먼저 보강하세요.";
  const statusTone = errors > 0 ? "danger" : flags > 0 ? "warning" : "success";

  return `
    <section class="report-hero consult-hero">
      <div class="report-hero-main">
        <p class="eyebrow">Executive Analysis Briefing</p>
        <h3>${escapeHtml(verdict)}</h3>
        <p>${escapeHtml(summary)}</p>
        <div class="briefing-meta">
          <span>${consultation.known.length} known facts</span>
          <span>${missing} missing inputs</span>
          <span>${consultation.recommendedAnalyses.length} methods</span>
          <span>${codeCount} R templates</span>
        </div>
      </div>
      <div class="report-hero-aside briefing-score ${statusTone}">
        <span>Input readiness</span>
        <strong>${completion}%</strong>
        ${renderBar(completion)}
        <small>${errors > 0 ? `${errors}개 차단 조건부터 해결하세요.` : missing === 0 ? "패킷 검토와 실제 데이터 확인 단계입니다." : `${missing}개 설계 정보가 더 필요합니다.`}</small>
      </div>
    </section>
  `;
}

function renderConsultationDecisionBoard(consultation) {
  const primary = consultation.recommendedAnalyses[0];
  const task = buildConsultationTaskQueue(consultation)[0];
  const warning = consultation.critic.warnings.find((item) => item.severity === "error") ??
    consultation.critic.warnings[0];
  const cards = [
    {
      tone: "now",
      label: "Now",
      title: primary?.title ?? "설계 정보 보강",
      body: primary?.rationale ?? "연구 목적, 구성개념, 문항 수, 표본 수를 먼저 입력해야 분석 계획을 만들 수 있습니다.",
      meta: primary ? `${primary.priority} priority · ${primary.confidence} confidence` : "intake needed"
    },
    {
      tone: task?.tone ?? "next",
      label: "Next",
      title: task?.title ?? "연구 패킷 검토",
      body: task?.body ?? "현재 입력으로 생성된 연구 패킷과 R 템플릿을 확인하세요.",
      meta: task?.fieldId ? "입력칸으로 이동 가능" : "review packet",
      fieldId: task?.fieldId
    },
    {
      tone: warning?.severity === "error" ? "danger" : "watch",
      label: "Watch",
      title: warning?.message ?? "자동 통과 기준은 없습니다",
      body: warning
        ? "이 조건은 추천 분석의 해석 범위와 실행 가능성을 제한합니다."
        : "적합도 지수와 신뢰도 계수는 절대적 합격 기준이 아니라 맥락 속에서 보고해야 합니다.",
      meta: warning ? warning.severity : "boundary"
    }
  ];

  return `
    <section class="result-section decision-board" aria-label="Consultation decisions">
      ${cards.map((card) => `
        <article class="decision-card ${escapeHtml(card.tone)}">
          <span>${escapeHtml(card.label)}</span>
          <strong>${escapeHtml(card.title)}</strong>
          <p>${escapeHtml(card.body)}</p>
          <div class="decision-card-footer">
            <small>${escapeHtml(card.meta)}</small>
            ${card.fieldId ? `<button type="button" class="report-tool" data-report-action="focus_field" data-field-target="${escapeHtml(card.fieldId)}">입력</button>` : ""}
          </div>
        </article>
      `).join("")}
    </section>
  `;
}

function renderConsultationPipeline(analyses) {
  if (analyses.length === 0) {
    return `
      <section class="result-section analysis-pipeline">
        <h3>분석 파이프라인</h3>
        <p class="soft-copy">설계 정보를 더 입력하면 권장 분석 순서를 만들 수 있습니다.</p>
      </section>
    `;
  }

  return `
    <section class="result-section analysis-pipeline">
      <div class="section-title-row">
        <h3>분석 파이프라인</h3>
        <span class="count-badge">${analyses.length}</span>
      </div>
      <div class="pipeline-list">
        ${analyses.map((analysis, index) => `
          <article class="pipeline-item ${escapeHtml(analysis.priority)}">
            <div class="pipeline-index">${String(index + 1).padStart(2, "0")}</div>
            <div>
              <div class="pipeline-heading">
                <strong>${escapeHtml(analysis.title)}</strong>
                <span>${escapeHtml(analysis.priority)} · ${escapeHtml(analysis.confidence)}</span>
              </div>
              <p>${escapeHtml(analysis.rationale)}</p>
              <small>${escapeHtml(analysis.output)}</small>
            </div>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

function renderConsultationChat(consultation) {
  const tasks = buildConsultationTaskQueue(consultation);
  const path = consultation.recommendedAnalyses.slice(0, 4).map((analysis) => analysis.title).join(" → ");
  const boundary = consultation.critic.mustNotDo[0] ?? consultation.agentBoundaries[0];

  return `
    <section class="ai-panel">
      <div class="ai-panel-header">
        <div>
          <p class="eyebrow">Agent Work Queue</p>
          <h3>상담 작업 큐</h3>
        </div>
        <span>deterministic</span>
      </div>
      <div class="consult-task-grid">
        <article class="consult-path-card">
          <span>Recommended path</span>
          <strong>${escapeHtml(path || "설계 정보를 더 입력하면 분석 경로가 생성됩니다.")}</strong>
          <p>이 경로는 현재 입력값으로 만든 계획이며, 실제 원자료 분석 결과가 아닙니다.</p>
        </article>
        <div class="consult-task-list">
          ${tasks.map((task, index) => `
            <article class="consult-task-card ${escapeHtml(task.tone)}">
              <div>
                <span>${String(index + 1).padStart(2, "0")}</span>
                <strong>${escapeHtml(task.title)}</strong>
                <p>${escapeHtml(task.body)}</p>
              </div>
              ${task.fieldId ? `<button type="button" class="report-tool" data-report-action="focus_field" data-field-target="${escapeHtml(task.fieldId)}">입력</button>` : ""}
            </article>
          `).join("")}
        </div>
        <article class="ai-bubble guardrail">
          <span>Boundary</span>
          <p>${escapeHtml(boundary)}</p>
        </article>
      </div>
    </section>
  `;
}

function buildConsultationTaskQueue(consultation) {
  const tasks = consultation.uncertain.slice(0, 5).map((item) => ({
    title: item.question,
    body: "이 항목이 채워지면 추천 분석과 연구 패킷의 잠정 표시가 줄어듭니다.",
    fieldId: consultationFieldMap(item.id),
    tone: item.id === "group_variable" || item.id === "group_sizes" ? "danger" : "warning"
  }));

  if (consultation.context.itemIdsGenerated) {
    tasks.push({
      title: "실제 문항 컬럼명으로 placeholder를 교체하세요.",
      body: "문항-요인 매핑표와 R 템플릿에서 item1, item2 대신 실제 컬럼명을 사용할 수 있습니다.",
      fieldId: "itemIdsInput",
      tone: "warning"
    });
  }

  if (consultation.context.highStakes) {
    tasks.unshift({
      title: "고위험 사용은 별도 검토 흐름이 필요합니다.",
      body: "임상, 채용, 선발, 처치 결정에는 별도 전문가·법적·윤리 검토가 필요합니다.",
      fieldId: "highStakesInput",
      tone: "danger"
    });
  }

  if (tasks.length === 0) {
    tasks.push({
      title: "오른쪽 연구 패킷을 검토하세요.",
      body: "입력 정보는 충분합니다. 이제 연구 패킷, 코드 템플릿, 경계 문구를 함께 확인하면 됩니다.",
      fieldId: null,
      tone: "success"
    });
  }

  return tasks.slice(0, 5);
}

function consultationFieldMap(id) {
  return {
    purpose: "purposeInput",
    construct: "constructInput",
    intended_use: "intendedUseInput",
    item_count: "itemCountInput",
    sample_size: "sampleSizeInput",
    response_scale: "scaleMinInput",
    missing_data: "missingDataInput",
    distribution: "distributionInput",
    group_variable: "groupVariableInput",
    group_sizes: "groupsInput"
  }[id] ?? null;
}

function renderStudyPacket(consultation) {
  const packet = createStudyPacket(consultation);
  const mappingLimit = 36;
  const mappingRows = packet.itemFactorMap.slice(0, mappingLimit);
  const hiddenMappingCount = packet.itemFactorMap.length - mappingRows.length;

  return `
    <section class="study-packet result-section result-annex" aria-labelledby="studyPacketTitle">
      <div class="packet-header">
        <div>
          <p class="eyebrow">Annex · Study Packet Builder</p>
          <h3 id="studyPacketTitle">연구 패킷</h3>
          <p>상담 입력값을 실제 연구자가 확인할 작업 단위로 재구성했습니다. 이 패킷은 분석을 실행하지 않고, 실행 전 필요한 설계·자료·보고 항목을 정리합니다.</p>
        </div>
        <div class="packet-status">
          <span>Packet readiness</span>
          <strong>${packet.completion}%</strong>
          ${renderBar(packet.completion)}
          <button type="button" class="report-tool" data-report-action="copy_packet">패킷 복사</button>
        </div>
      </div>

      <div class="packet-summary-grid">
        ${packet.designSummary.map(renderPacketSummaryItem).join("")}
      </div>

      <div class="packet-layout">
        <article class="packet-card">
          <div class="packet-card-title">
            <span>01</span>
            <h4>현재 입력으로 확정된 것</h4>
          </div>
          ${packet.knownFacts.length === 0
            ? `<p class="soft-copy">아직 확정된 연구 입력값이 없습니다.</p>`
            : renderPacketTable(
              ["항목", "값"],
              packet.knownFacts.map((fact) => [fact.label, fact.value])
            )}
        </article>

        <article class="packet-card">
          <div class="packet-card-title">
            <span>02</span>
            <h4>가정</h4>
          </div>
          ${renderPacketChecklist(packet.assumptions)}
        </article>

        <article class="packet-card wide">
          <div class="packet-card-title">
            <span>03</span>
            <h4>변수 manifest</h4>
          </div>
          ${renderPacketTable(
            ["변수", "역할", "형식", "상태", "메모"],
            packet.variableManifest.map((row) => [row.name, row.role, row.type, row.status, row.note])
          )}
        </article>

        <article class="packet-card wide">
          <div class="packet-card-title">
            <span>04</span>
            <h4>문항-요인 매핑표</h4>
          </div>
          ${mappingRows.length > 0
            ? renderPacketTable(
              ["문항", "요인", "상태", "방향", "메모"],
              mappingRows.map((row) => [row.item, row.factor, row.status, row.direction, row.note])
            )
            : `<p class="soft-copy">문항 수를 입력하면 item1, item2 형식의 임시 매핑표를 만들 수 있습니다.</p>`}
          ${hiddenMappingCount > 0 ? `<p class="packet-footnote">나머지 ${hiddenMappingCount}개 문항은 복사한 패킷 텍스트와 전체 DTO에서 이어서 확인하세요.</p>` : ""}
        </article>

        <article class="packet-card">
          <div class="packet-card-title">
            <span>05</span>
            <h4>분석 순서</h4>
          </div>
          <ol class="packet-sequence">
            ${packet.analysisSequence.map((step) => `
              <li>
                <strong>${escapeHtml(step.title)}</strong>
                <span>${escapeHtml(step.priority)} · ${escapeHtml(step.confidence)}</span>
                <p>${escapeHtml(step.output)}</p>
              </li>
            `).join("")}
          </ol>
        </article>

        <article class="packet-card">
          <div class="packet-card-title">
            <span>06</span>
            <h4>누락 정보</h4>
          </div>
          ${renderPacketChecklist(packet.missingInformation, "현재 추가 필수 정보는 없습니다. 그래도 실제 원자료의 결측과 범주 분포는 분석 전에 다시 확인하세요.")}
        </article>

        <article class="packet-card">
          <div class="packet-card-title">
            <span>07</span>
            <h4>보고문 체크리스트</h4>
          </div>
          ${renderPacketChecklist(packet.reportingChecklist)}
        </article>

        <article class="packet-card">
          <div class="packet-card-title">
            <span>08</span>
            <h4>다음 입력해야 할 정보</h4>
          </div>
          ${renderPacketChecklist(packet.nextInputs)}
        </article>

        <article class="packet-card wide">
          <div class="packet-card-title">
            <span>09</span>
            <h4>R 코드 템플릿</h4>
          </div>
          ${packet.codeTemplates.length === 0
            ? `<p class="soft-copy">현재 조건에서는 안전하게 생성할 R 템플릿이 없습니다.</p>`
            : `<div class="packet-template-list">
              ${packet.codeTemplates.map((template) => `
                <details class="packet-template">
                  <summary>
                    <span>${escapeHtml(template.title)}</span>
                    <small>${template.packages.map(escapeHtml).join(" · ")}</small>
                  </summary>
                  <pre><code>${escapeHtml(template.code)}</code></pre>
                </details>
              `).join("")}
            </div>`}
        </article>

        <article class="packet-card wide boundary-card">
          <div class="packet-card-title">
            <span>10</span>
            <h4>에이전트 경계</h4>
          </div>
          ${renderPacketChecklist(packet.boundaryChecklist)}
        </article>
      </div>
    </section>
  `;
}

function renderPacketSummaryItem(item) {
  return `
    <article class="packet-summary-item ${escapeHtml(item.state)}">
      <span>${escapeHtml(item.label)}</span>
      <strong>${escapeHtml(item.value)}</strong>
      <p>${escapeHtml(item.detail)}</p>
    </article>
  `;
}

function renderPacketTable(headers, rows) {
  return `
    <div class="packet-table-wrap">
      <table class="packet-table">
        <thead>
          <tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr>
        </thead>
        <tbody>
          ${rows.map((row) => `
            <tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderPacketChecklist(items, emptyText = "아직 표시할 항목이 없습니다.") {
  if (items.length === 0) {
    return `<p class="soft-copy">${escapeHtml(emptyText)}</p>`;
  }
  return `
    <ul class="packet-checklist">
      ${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
    </ul>
  `;
}

function renderMissingInfo(consultation) {
  if (consultation.uncertain.length === 0) {
    return `
      <section class="result-section">
        <h3>누락 정보</h3>
        <p class="soft-copy">필수 설계 정보가 충분합니다. 그래도 실제 분석 전에는 원자료 분포와 결측 패턴을 확인하세요.</p>
      </section>
    `;
  }

  return `
    <section class="result-section">
      <div class="section-title-row">
        <h3>아직 필요한 정보</h3>
        <span class="count-badge">${consultation.uncertain.length}</span>
      </div>
      <div class="chip-list">
        ${consultation.uncertain.map((item) => `<span class="info-chip">${escapeHtml(item.question)}</span>`).join("")}
      </div>
    </section>
  `;
}

function renderAnalysisRoadmap(analyses) {
  return `
    <section class="result-section">
      <h3>추천 분석 로드맵</h3>
      <div class="roadmap">
        ${analyses.map((analysis, index) => `
          <article class="roadmap-item ${analysis.priority}">
            <div class="roadmap-index">${String(index + 1).padStart(2, "0")}</div>
            <div>
              <div class="roadmap-title">
                <strong>${escapeHtml(analysis.title)}</strong>
                <span>${escapeHtml(analysis.priority)} · ${escapeHtml(analysis.confidence)}</span>
              </div>
              <p>${escapeHtml(analysis.rationale)}</p>
              <small>${escapeHtml(analysis.output)}</small>
            </div>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

function renderEvidenceTopics(evidence) {
  return `
    <section class="result-section result-annex evidence-annex">
      <div class="section-title-row">
        <h3>근거 토픽</h3>
        <span class="count-badge">${evidence.length}</span>
      </div>
      <div class="evidence-grid">
        ${evidence.slice(0, 6).map((topic) => `
          <article class="evidence-card">
            <strong>${escapeHtml(topic.title)}</strong>
            ${topic.source?.citation ? `<small>${escapeHtml(topic.source.citation)}</small>` : ""}
            <p>${escapeHtml(topic.summary)}</p>
            <ul>
              ${(topic.checks ?? []).slice(0, 2).map((check) => `<li>${escapeHtml(check)}</li>`).join("")}
            </ul>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

function renderCodeTemplates(templates) {
  if (templates.length === 0) {
    return `
      <section class="result-section">
        <h3>코드 템플릿</h3>
        <p class="soft-copy">현재 입력 조건에서는 안전하게 생성할 템플릿이 없습니다.</p>
      </section>
    `;
  }

  return `
    <section class="result-section">
      <h3>코드 템플릿</h3>
      <div class="template-list">
        ${templates.map((template) => `
          <details class="template-card">
            <summary>
              <span>${escapeHtml(template.title)}</span>
              <small>${template.packages.map(escapeHtml).join(" · ")}</small>
            </summary>
            <pre><code>${escapeHtml(template.code)}</code></pre>
          </details>
        `).join("")}
      </div>
    </section>
  `;
}

function renderWarnings(warnings) {
  return `
    <section class="result-section result-annex warning-annex">
      <div class="section-title-row">
        <h3>비판자 경고</h3>
        <span class="count-badge">${warnings.length}</span>
      </div>
      <div class="warning-list">
        ${warnings.length === 0
          ? `<p class="soft-copy">차단 경고는 없습니다. 실제 분석 전 전문가 검토는 유지하세요.</p>`
          : warnings.map((warning) => `
            <div class="warning-row ${warning.severity}">
              <strong>${escapeHtml(warning.severity.toUpperCase())}</strong>
              <span>${escapeHtml(warning.message)}</span>
            </div>
          `).join("")}
      </div>
    </section>
  `;
}

function renderScale() {
  const scale = state.scale;
  nodes.scaleTitle.textContent = scale.name;
  nodes.scaleMeta.textContent = `${scale.id} · ${scale.version ?? "unversioned"}`;

  nodes.assessmentForm.innerHTML = scale.items.map((item, index) => {
    const itemScale = item.responseScale ?? scale.responseScale;
    const labels = scale.responseScale.labels ?? {};
    const options = range(itemScale.min, itemScale.max)
      .map((value) => `
        <label class="choice">
          <input type="radio" name="${escapeHtml(item.id)}" value="${value}">
          <span>${value}</span>
          <small>${escapeHtml(labels[String(value)] ?? responseLabel(value, itemScale))}</small>
        </label>
      `)
      .join("");

    return `
      <fieldset class="item-card">
        <legend>
          <span>${index + 1}</span>
          ${escapeHtml(item.text ?? item.id)}
        </legend>
        <div class="choices">${options}</div>
      </fieldset>
    `;
  }).join("");
}

function resetResponses() {
  state.responses = {};
  nodes.assessmentForm.reset();
  renderEmptyScoreState();
  updateProgress();
}

function renderScoreResult() {
  const result = scoreAssessment(state.scale, state.responses);
  const scaleMin = result.scoring.responseScale.min;
  const scaleMax = result.scoring.responseScale.max;
  const subscales = Object.entries(result.scoring.subscales);
  const validity = validityMeta(result.validity.flag);
  const warnings = result.validity.warnings.map(formatWarning);

  nodes.resultPanel.innerHTML = `
    <article class="result-stack">
      <header class="result-heading">
        <div>
          <p class="eyebrow">Assessment Report</p>
          <h2>${escapeHtml(result.scaleName)}</h2>
        </div>
        <span class="status-pill ${validity.className}">${validity.label}</span>
      </header>

      ${renderReportToolbar([
        { label: "요약 복사", action: "copy_brief" },
        { label: "경고 보기", action: "review_flags" },
        { label: "PDF 저장", action: "export_report" },
        { label: "응답 수정", action: "edit_answers" }
      ])}

      <section class="metric-grid">
        ${renderMetric("전체 평균", `${formatNumber(result.scoring.overall.score)} / ${scaleMax}`, renderBar(scorePercent(result.scoring.overall.score, scaleMin, scaleMax)))}
        ${renderMetric("응답 상태", result.validity.flag, validity.description)}
        ${renderMetric("응답 문항", `${result.scoring.overall.answeredItems}개`, "scored items")}
      </section>

      ${renderScoreBrief(result, validity, scaleMin, scaleMax)}
      ${renderScoreActionRail(result)}
      ${renderScoreCounselingPanel(result, scaleMin, scaleMax)}

      ${warnings.length > 0 ? `
        <section class="result-section warning-surface">
          <h3>주의해서 볼 점</h3>
          <ul>${warnings.map((warning) => `<li>${escapeHtml(warning)}</li>`).join("")}</ul>
        </section>
      ` : ""}

      <section class="result-section">
        <h3>하위요인 점수</h3>
        <div class="subscale-list">
          ${subscales.map(([id, subscale]) => renderSubscale(id, subscale, scaleMin, scaleMax)).join("")}
        </div>
      </section>

      <section class="result-section">
        <h3>해석 경계</h3>
        <p class="soft-copy">이 결과는 진단이 아니라 응답 경향을 정리한 참고 자료입니다. 실제 서비스에는 검증되거나 라이선스가 확보된 척도와 개인정보 보호 절차가 필요합니다.</p>
      </section>
    </article>
  `;
}

function renderUploadReport() {
  syncUploadMappingsFromUi();
  let analysis;
  try {
    analysis = analyzeUploadedDataset();
  } catch (error) {
    nodes.resultPanel.innerHTML = renderMessage({
      title: "데이터 리포트를 만들 수 없습니다",
      body: error.message,
      tone: "danger"
    });
    return;
  }

  analysis.readiness = buildDatasetReadiness(analysis);
  const statusClass = readinessStatusClass(analysis.readiness.status);

  nodes.resultPanel.innerHTML = `
    <article class="result-stack">
      <header class="result-heading">
        <div>
          <p class="eyebrow">Dataset Report</p>
          <h2>${escapeHtml(analysis.fileName)}</h2>
        </div>
        <span class="status-pill ${statusClass}">${escapeHtml(analysis.readiness.label)}</span>
      </header>

      ${renderReportToolbar([
        { label: "요약 복사", action: "copy_brief" },
        { label: "경고 보기", action: "review_flags" },
        { label: "PDF 저장", action: "export_report" },
        { label: "매핑 수정", action: "edit_upload" }
      ])}

      <section class="metric-grid">
        ${renderMetric("응답자", `${analysis.respondentCount}명`, "rows")}
        ${renderMetric("문항 컬럼", `${analysis.itemCount}개`, "selected items")}
        ${renderMetric("결측률", `${formatPercent(analysis.missingRate)}`, renderBar(100 - Math.round(analysis.missingRate * 100)))}
        ${renderMetric("전체 α", analysis.overallAlpha === null ? "N/A" : formatNumber(analysis.overallAlpha), `${analysis.alphaRows} complete rows`)}
      </section>

      ${renderUploadBrief(analysis)}
      ${renderDatasetReadinessAgent(analysis.readiness)}
      ${renderUploadActions(analysis)}
      ${renderUploadWarnings(analysis)}
      ${renderUploadSubscales(analysis)}
      ${renderUploadGroups(analysis)}
      ${renderUploadPreview(analysis)}
    </article>
  `;
}

function analyzeUploadedDataset() {
  const selected = selectedUploadMappings();
  if (state.upload.rows.length === 0) {
    throw new Error("먼저 데이터 파일을 올려주세요.");
  }
  if (selected.length === 0) {
    throw new Error("문항으로 사용할 컬럼을 하나 이상 선택하세요.");
  }

  const scale = readUploadScale();
  const method = nodes.uploadScoreMethodInput.value;
  const groupColumn = nodes.uploadGroupSelect.value;
  const totalCells = state.upload.rows.length * selected.length;
  const factors = new Map();
  for (const mapping of selected) {
    const factor = mapping.factor || "total";
    if (!factors.has(factor)) {
      factors.set(factor, {
        itemMappings: selected.filter((item) => (item.factor || "total") === factor),
        rows: [],
        values: []
      });
    }
  }
  let missingCellCount = 0;
  let invalidCellCount = 0;
  const allValues = [];
  const allCompleteRows = [];
  const groupSummaries = new Map();
  const itemMissing = new Map(selected.map((mapping) => [mapping.column, 0]));

  for (const row of state.upload.rows) {
    const scoredRow = [];
    let complete = true;
    const group = groupColumn ? String(row[groupColumn] ?? "").trim() || "(blank)" : null;
    const respondentValues = [];

    for (const mapping of selected) {
      const raw = parseNumericCell(row[mapping.column]);
      if (raw === null) {
        missingCellCount += 1;
        itemMissing.set(mapping.column, (itemMissing.get(mapping.column) ?? 0) + 1);
        complete = false;
        continue;
      }
      if (raw < scale.min || raw > scale.max) {
        invalidCellCount += 1;
        complete = false;
        continue;
      }
      const scored = mapping.reverse ? scale.min + scale.max - raw : raw;
      scoredRow.push(scored);
      respondentValues.push(scored);
      allValues.push(scored);

      factors.get(mapping.factor || "total").values.push(scored);
    }

    for (const [factor, summary] of factors) {
      const factorValues = summary.itemMappings
        .map((mapping) => {
          const raw = parseNumericCell(row[mapping.column]);
          if (raw === null || raw < scale.min || raw > scale.max) {
            return null;
          }
          return mapping.reverse ? scale.min + scale.max - raw : raw;
        });
      if (factorValues.every((value) => value !== null)) {
        summary.rows.push(factorValues);
      }
      factors.set(factor, summary);
    }

    if (complete) {
      allCompleteRows.push(scoredRow);
    }

    if (group !== null) {
      const current = groupSummaries.get(group) ?? { count: 0, values: [] };
      current.count += 1;
      current.values.push(...respondentValues);
      groupSummaries.set(group, current);
    }
  }

  const subscales = [...factors.entries()].map(([factor, summary]) => ({
    id: factor,
    label: factor,
    itemCount: summary.itemMappings.length,
    method,
    respondentCount: summary.rows.length,
    score: summarizeSubscaleScore(summary, method),
    alpha: summary.itemMappings.length >= 2 ? cronbachAlpha(summary.rows) : null
  }));

  const missingItems = [...itemMissing.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return {
    fileName: state.upload.fileName ?? "uploaded data",
    respondentCount: state.upload.rows.length,
    headers: state.upload.headers,
    itemCount: selected.length,
    scale,
    method,
    groupColumn,
    groupSummaries: [...groupSummaries.entries()].map(([group, summary]) => ({
      group,
      count: summary.count,
      mean: summary.values.length > 0 ? round(mean(summary.values)) : null
    })),
    missingCellCount,
    invalidCellCount,
    totalCells,
    missingRate: totalCells === 0 ? 0 : missingCellCount / totalCells,
    overallMean: allValues.length > 0 ? round(mean(allValues)) : null,
    overallAlpha: selected.length >= 2 ? cronbachAlpha(allCompleteRows) : null,
    alphaRows: allCompleteRows.length,
    subscales,
    missingItems
  };
}

function renderUploadBrief(analysis) {
  const headline = analysis.invalidCellCount > 0
    ? "범위 밖 응답을 먼저 확인하세요"
    : analysis.missingRate > 0.15
      ? "결측 패턴 검토가 필요합니다"
      : "브라우저 안에서 코호트 요약을 계산했습니다";
  const summary = `${analysis.respondentCount}명, ${analysis.itemCount}개 문항을 ${analysis.scale.min}-${analysis.scale.max} 범위로 채점했습니다. 전체 평균은 ${formatNullableNumber(analysis.overallMean)}입니다.`;

  return `
    <section class="report-hero data-hero">
      <div class="report-hero-main">
        <p class="eyebrow">Browser-Only Data Report</p>
        <h3>${escapeHtml(headline)}</h3>
        <p>${escapeHtml(summary)}</p>
      </div>
      <div class="report-hero-aside">
        <span>Missing</span>
        <strong>${formatPercent(analysis.missingRate)}</strong>
        ${renderBar(100 - Math.round(analysis.missingRate * 100))}
        <small>원자료는 서버로 전송되지 않았습니다.</small>
      </div>
    </section>
  `;
}

function buildDatasetReadiness(analysis) {
  const issues = [];
  const methodHints = [];
  let score = 100;
  const invalidRate = analysis.totalCells === 0 ? 0 : analysis.invalidCellCount / analysis.totalCells;
  const alphaCoverage = analysis.respondentCount === 0 ? 0 : analysis.alphaRows / analysis.respondentCount;
  const expectedFactors = analysis.subscales.length > 1
    ? analysis.subscales.length
    : numberOrNull(nodes.expectedFactorsInput.value);
  const factorScreeningReadyN = Math.max(200, analysis.itemCount * 10);
  const factorScreeningCleanupN = Math.max(100, analysis.itemCount * 5);

  const addIssue = ({ severity, title, body, action, penalty }) => {
    issues.push({ severity, title, body, action });
    score -= penalty;
  };

  if (invalidRate > 0.01) {
    addIssue({
      severity: "blocker",
      title: "범위 밖 응답",
      body: `${analysis.invalidCellCount}개 셀이 ${analysis.scale.min}-${analysis.scale.max} 범위를 벗어났습니다.`,
      action: "원자료 코딩, 결측값 기호, 역채점 전 원점수 범위를 먼저 확인하세요.",
      penalty: 24
    });
  } else if (analysis.invalidCellCount > 0) {
    addIssue({
      severity: "caution",
      title: "범위 밖 응답 소수",
      body: `${analysis.invalidCellCount}개 셀이 응답 범위 밖입니다.`,
      action: "해당 행과 문항을 확인하고 제외 기준을 기록하세요.",
      penalty: 10
    });
  }

  if (analysis.missingRate > 0.15) {
    addIssue({
      severity: "blocker",
      title: "높은 결측률",
      body: `선택 문항 기준 결측률이 ${formatPercent(analysis.missingRate)}입니다.`,
      action: "문항별 결측 원인과 삭제/대체/FIML 같은 처리 방침을 먼저 정하세요.",
      penalty: 28
    });
  } else if (analysis.missingRate > 0.05) {
    addIssue({
      severity: "caution",
      title: "결측 검토 필요",
      body: `선택 문항 기준 결측률이 ${formatPercent(analysis.missingRate)}입니다.`,
      action: "결측이 특정 문항이나 집단에 몰려 있는지 확인하세요.",
      penalty: 14
    });
  }

  if (analysis.respondentCount < 30) {
    addIssue({
      severity: "blocker",
      title: "표본 부족",
      body: `${analysis.respondentCount}명으로 코호트 수준 심리측정 요약이 매우 제한됩니다.`,
      action: "문항 스크리닝 수준으로만 보고하고 표본을 보강하세요.",
      penalty: 28
    });
  } else if (analysis.respondentCount < 100) {
    addIssue({
      severity: "caution",
      title: "작은 표본",
      body: `${analysis.respondentCount}명으로 복잡한 CFA/IRT/집단 비교에는 불안정할 수 있습니다.`,
      action: "초기 스크리닝과 신뢰도 확인 중심으로 보고하고, 모형 기반 결론은 보류하세요.",
      penalty: 18
    });
  }

  if (analysis.itemCount < 2) {
    addIssue({
      severity: "blocker",
      title: "문항 수 부족",
      body: `${analysis.itemCount}개 문항만 선택되어 신뢰도와 내적구조 검토가 제한됩니다.`,
      action: "실제 척도 문항 컬럼이 모두 선택되었는지 매핑을 확인하세요.",
      penalty: 20
    });
  } else if (analysis.itemCount < 3) {
    addIssue({
      severity: "caution",
      title: "문항 수 제한",
      body: `${analysis.itemCount}개 문항으로 요인 구조 검토가 제한됩니다.`,
      action: "하위척도별 문항 수가 충분한지 매핑을 확인하세요.",
      penalty: 10
    });
  }

  if (analysis.itemCount >= 2 && analysis.alphaRows < 2) {
    addIssue({
      severity: "blocker",
      title: "신뢰도 계산 불가",
      body: "완전응답 행이 2개 미만이라 Cronbach alpha가 계산되지 않습니다.",
      action: "결측 처리 전후 신뢰도 결과를 분리해서 확인하세요.",
      penalty: 18
    });
  } else if (analysis.itemCount >= 2 && alphaCoverage < 0.7) {
    addIssue({
      severity: "caution",
      title: "완전응답 행 부족",
      body: `alpha 계산에 사용된 완전응답 행이 전체의 ${formatPercent(alphaCoverage)}입니다.`,
      action: "결측 처리 전후의 신뢰도 결과를 분리해 보고하세요.",
      penalty: 10
    });
  }

  const weakSubscales = analysis.subscales.filter((subscale) => subscale.itemCount < 3);
  if (weakSubscales.length > 0) {
    addIssue({
      severity: "caution",
      title: "하위척도 문항 수 제한",
      body: `${weakSubscales.map((subscale) => subscale.label).join(", ")} 요인은 문항이 3개 미만입니다.`,
      action: "요인명 자동 추론이 맞는지 확인하고, 필요하면 문항-요인 매핑을 수정하세요.",
      penalty: 10
    });
  }

  if (analysis.groupColumn && analysis.groupSummaries.length > 0) {
    const smallestGroup = [...analysis.groupSummaries].sort((a, b) => a.count - b.count)[0];
    if (smallestGroup.count < 20) {
      addIssue({
        severity: "blocker",
        title: "집단 비교 표본 부족",
        body: `${smallestGroup.group} 집단이 ${smallestGroup.count}명입니다.`,
        action: "집단 비교, 측정동일성, DIF 해석을 보류하고 표본을 보강하세요.",
        penalty: 20
      });
    } else if (smallestGroup.count < 50) {
      addIssue({
        severity: "caution",
        title: "작은 집단 크기",
        body: `${smallestGroup.group} 집단이 ${smallestGroup.count}명입니다.`,
        action: "측정동일성이나 DIF는 집단별 표본 수를 늘리거나 탐색적 스크리닝으로 낮춰 해석하세요.",
        penalty: 12
      });
    }
  }

  const highMissingItems = analysis.missingItems
    .filter(([, count]) => count / analysis.respondentCount >= 0.15)
    .map(([column]) => column);
  if (highMissingItems.length > 0) {
    addIssue({
      severity: "caution",
      title: "문항별 결측 집중",
      body: `${highMissingItems.slice(0, 3).join(", ")} 문항의 결측률이 높습니다.`,
      action: "문항 표시 오류, 분기문항, 응답자 피로, 역문항 이해 문제를 점검하세요.",
      penalty: 10
    });
  }

  methodHints.push(methodHint({
    title: "Data screening",
    status: issues.some((issue) => issue.severity === "blocker") ? "needs_work" : "ready",
    body: issues.length > 0
      ? "경고를 정리한 뒤 분포와 범주 빈도를 확인하세요."
      : "결측과 범위 검토 기준으로는 다음 스크리닝으로 넘어갈 수 있습니다."
  }));

  methodHints.push(methodHint({
    title: "Reliability",
    status: analysis.overallAlpha === null || alphaCoverage < 0.7 ? "needs_work" : "ready",
    body: analysis.overallAlpha === null
      ? "완전응답 행 또는 문항 수가 부족해 alpha가 계산되지 않았습니다."
      : `전체 alpha는 ${formatNullableNumber(analysis.overallAlpha)}이고 완전응답 커버리지는 ${formatPercent(alphaCoverage)}입니다. 단일 컷오프가 아니라 척도 목적과 함께 해석하세요.`
  }));

  const factorStatus = analysis.respondentCount >= factorScreeningReadyN && expectedFactors
    ? "candidate"
    : analysis.respondentCount >= factorScreeningCleanupN ? "needs_work" : "later";
  methodHints.push(methodHint({
    title: "Factor screening",
    status: factorStatus,
    body: factorStatus === "candidate"
      ? `N이 ${factorScreeningReadyN} 기준을 넘고 예상 요인 수가 입력되어 구조 검토 후보입니다.`
      : expectedFactors
        ? `N이 ${factorScreeningReadyN} 권장 기준보다 작습니다. 탐색적 스크리닝 또는 표본 보강을 우선하세요.`
        : "예상 요인 수가 입력되지 않았습니다. 요인 가설을 먼저 고정하세요."
  }));

  methodHints.push(methodHint({
    title: "IRT / DIF",
    status: analysis.respondentCount >= 300 && analysis.itemCount >= 5 && analysis.missingRate <= 0.05 ? "candidate" : "later",
    body: analysis.respondentCount >= 300 && analysis.itemCount >= 5 && analysis.missingRate <= 0.05
      ? "차원성, 국소독립성, 집단 변수 검토 뒤 IRT/DIF 민감도 분석 후보입니다."
      : "현재는 신뢰도와 구조 스크리닝이 먼저입니다."
  }));

  if (analysis.groupColumn) {
    const allGroupsReady = analysis.groupSummaries.every((group) => group.count >= 50);
    const anyGroupTiny = analysis.groupSummaries.some((group) => group.count < 20);
    methodHints.push(methodHint({
      title: "Group comparison",
      status: allGroupsReady ? "candidate" : anyGroupTiny ? "later" : "needs_work",
      body: allGroupsReady
        ? "집단별 표본 수는 1차 스크리닝 기준을 넘습니다. 기저 CFA 후 측정동일성을 검토하세요."
        : anyGroupTiny
          ? "20명 미만 집단이 있어 집단 비교 해석은 보류하는 편이 안전합니다."
          : "20-49명 집단이 있어 집단 비교는 탐색적 스크리닝으로 낮춰 해석하세요."
    }));
  }

  const nextSteps = buildReadinessNextSteps({ analysis, issues, methodHints });
  const blockers = issues.filter((issue) => issue.severity === "blocker");
  const cautions = issues.filter((issue) => issue.severity === "caution");
  const clampedScore = Math.max(0, Math.min(100, score));

  return {
    score: clampedScore,
    status: blockers.length > 0 ? "not_ready" : cautions.length > 0 ? "cleanup" : "ready",
    label: blockers.length > 0 ? "Not ready" : cautions.length > 0 ? "Needs cleanup" : "Ready",
    summary: blockers.length > 0
      ? "분석을 진행하기 전에 데이터 코딩과 결측 조건을 먼저 정리해야 합니다."
      : cautions.length > 0
        ? "큰 차단 조건은 없지만, 리포트 전 몇 가지 설계 판단이 필요합니다."
        : "현재 업로드 요약만 보면 다음 스크리닝 단계로 넘어갈 수 있습니다.",
    issues,
    nextSteps,
    methodHints,
    boundaries: [
      "이 판단은 업로드된 요약 통계와 매핑 정보만 사용합니다.",
      "CFA, IRT, DIF, 측정동일성은 아직 실행되지 않았습니다.",
      "LLM이나 상담 레이어가 점수나 alpha를 다시 계산하지 않습니다."
    ]
  };
}

function methodHint({ title, status, body }) {
  const labels = {
    ready: "ready",
    candidate: "candidate",
    needs_work: "needs work",
    later: "later"
  };
  return {
    title,
    status,
    label: labels[status] ?? status,
    body
  };
}

function readinessStatusClass(status) {
  if (status === "not_ready") {
    return "danger";
  }
  if (status === "cleanup") {
    return "warning";
  }
  return "success";
}

function buildReadinessNextSteps({ analysis, issues, methodHints }) {
  const steps = [];
  const firstBlocker = issues.find((issue) => issue.severity === "blocker");
  const firstCaution = issues.find((issue) => issue.severity === "caution");

  if (firstBlocker) {
    steps.push({
      title: firstBlocker.title,
      body: firstBlocker.action
    });
  }
  if (firstCaution) {
    steps.push({
      title: firstCaution.title,
      body: firstCaution.action
    });
  }
  if (analysis.groupColumn) {
    steps.push({
      title: "집단 비교 전제 확인",
      body: "집단별 N, 결측률, 문항 분포를 나눠 보고 측정동일성/DIF 여부를 결정하세요."
    });
  }

  const nextMethod = methodHints.find((hint) => hint.status === "candidate" || hint.status === "ready");
  steps.push({
    title: nextMethod?.title ?? "분석 계획 고정",
    body: nextMethod?.body ?? "문항-요인 매핑과 결측 처리 방침을 확정한 뒤 R 코드 템플릿으로 넘어가세요."
  });

  steps.push({
    title: "보고 경계 작성",
    body: "alpha나 평균을 단일 합격 기준으로 쓰지 말고, 구성개념과 점수 사용 목적에 연결해서 보고하세요."
  });

  return uniqueSteps(steps).slice(0, 3);
}

function uniqueSteps(steps) {
  const seen = new Set();
  return steps.filter((step) => {
    if (seen.has(step.title)) {
      return false;
    }
    seen.add(step.title);
    return true;
  });
}

function renderDatasetReadinessAgent(readiness) {
  return `
    <section class="agent-panel">
      <div class="agent-panel-header">
        <div>
          <p class="eyebrow">Dataset Readiness Agent</p>
          <h3>${escapeHtml(readiness.label)}</h3>
          <p>${escapeHtml(readiness.summary)}</p>
        </div>
        <div class="agent-score ${readiness.status}">
          <span>Readiness</span>
          <strong>${readiness.score}</strong>
          ${renderBar(readiness.score)}
        </div>
      </div>

      <div class="agent-grid">
        <section class="agent-card">
          <div class="section-title-row">
            <h4>막히는 조건</h4>
            <span class="count-badge">${readiness.issues.length}</span>
          </div>
          ${readiness.issues.length === 0
            ? `<p class="soft-copy">현재 요약 기준으로 즉시 차단할 조건은 없습니다.</p>`
            : readiness.issues.map((issue) => renderReadinessIssue(issue)).join("")}
        </section>

        <section class="agent-card">
          <div class="section-title-row">
            <h4>다음 3단계</h4>
            <span class="count-badge">${readiness.nextSteps.length}</span>
          </div>
          <div class="readiness-steps">
            ${readiness.nextSteps.map((step, index) => `
              <article class="readiness-step">
                <span>${index + 1}</span>
                <div>
                  <strong>${escapeHtml(step.title)}</strong>
                  <p>${escapeHtml(step.body)}</p>
                </div>
              </article>
            `).join("")}
          </div>
        </section>
      </div>

      <section class="agent-card">
        <h4>분석별 적합도 힌트</h4>
        <div class="method-fit-grid">
          ${readiness.methodHints.map((hint) => `
            <article class="method-fit ${hint.status}">
              <strong>${escapeHtml(hint.title)}</strong>
              <span>${escapeHtml(hint.label)}</span>
              <p>${escapeHtml(hint.body)}</p>
            </article>
          `).join("")}
        </div>
      </section>

      <div class="ai-bubble-list">
        ${readiness.boundaries.map((boundary) => renderChatBubble("guardrail", boundary)).join("")}
      </div>
    </section>
  `;
}

function renderReadinessIssue(issue) {
  return `
    <article class="readiness-issue ${issue.severity}">
      <span>${escapeHtml(issue.severity)}</span>
      <div>
        <strong>${escapeHtml(issue.title)}</strong>
        <p>${escapeHtml(issue.body)}</p>
        <small>${escapeHtml(issue.action)}</small>
      </div>
    </article>
  `;
}

function renderUploadActions(analysis) {
  const actions = [
    {
      title: "문항 매핑 검토",
      meta: `${analysis.itemCount} selected items`,
      body: "자동 선택된 문항 컬럼이 실제 문항인지, 역채점 표시가 맞는지 확인하세요."
    },
    {
      title: "결측·범위 점검",
      meta: `${analysis.missingCellCount} missing · ${analysis.invalidCellCount} invalid`,
      body: "범위 밖 값은 채점과 신뢰도 계산에서 제외했습니다."
    },
    {
      title: "다음 분석 준비",
      meta: "R templates",
      body: "이 요약은 스크리닝 단계입니다. CFA/IRT/DIF는 생성된 R 템플릿과 실제 원자료로 실행하세요."
    }
  ];
  return renderActionRail("Dataset Workflow", actions);
}

function renderUploadWarnings(analysis) {
  const warnings = [];
  if (analysis.invalidCellCount > 0) {
    warnings.push(`${analysis.invalidCellCount}개 셀이 응답 범위 밖이라 제외되었습니다.`);
  }
  if (analysis.missingRate > 0.15) {
    warnings.push(`결측률이 ${formatPercent(analysis.missingRate)}입니다. 문항별/집단별 결측 패턴을 확인하세요.`);
  }
  if (analysis.alphaRows < 2) {
    warnings.push("Cronbach alpha를 계산할 완전응답 행이 부족합니다.");
  }
  if (analysis.itemCount < 2) {
    warnings.push("신뢰도 계산에는 최소 2개 문항이 필요합니다.");
  }

  return `
    <section class="result-section warning-surface">
      <h3>데이터 검토 포인트</h3>
      ${warnings.length === 0
        ? `<p class="soft-copy">즉시 차단할 데이터 품질 경고는 없습니다. 그래도 실제 분석 전 원자료를 확인하세요.</p>`
        : `<ul>${warnings.map((warning) => `<li>${escapeHtml(warning)}</li>`).join("")}</ul>`}
    </section>
  `;
}

function renderUploadSubscales(analysis) {
  return `
    <section class="result-section">
      <h3>하위척도 요약</h3>
      <div class="subscale-list">
        ${analysis.subscales.map((subscale) => `
          <article class="subscale-row">
            <div>
              <strong>${escapeHtml(subscale.label)}</strong>
              <span>${subscale.itemCount} items · ${subscale.respondentCount} complete rows</span>
            </div>
            <div class="subscale-score">
              <b>${formatNullableNumber(subscale.score)}</b>
              <em class="band-mid">α ${formatNullableNumber(subscale.alpha)}</em>
            </div>
            ${renderBar(uploadSubscalePercent(subscale, analysis.scale))}
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

function renderUploadGroups(analysis) {
  if (!analysis.groupColumn) {
    return `
      <section class="result-section">
        <h3>집단 요약</h3>
        <p class="soft-copy">집단 변수를 선택하지 않았습니다. 집단 비교가 필요하면 매핑 화면에서 집단 변수를 선택하세요.</p>
      </section>
    `;
  }

  return `
    <section class="result-section">
      <h3>집단 요약</h3>
      <div class="data-table">
        <div class="data-table-row head">
          <span>집단</span>
          <span>N</span>
          <span>평균</span>
        </div>
        ${analysis.groupSummaries.map((group) => `
          <div class="data-table-row">
            <span>${escapeHtml(group.group)}</span>
            <span>${group.count}</span>
            <span>${formatNullableNumber(group.mean)}</span>
          </div>
        `).join("")}
      </div>
    </section>
  `;
}

function renderUploadPreview(analysis) {
  return `
    <section class="result-section">
      <h3>문항 결측 상위</h3>
      <div class="chip-list">
        ${analysis.missingItems.map(([column, count]) => `
          <span class="info-chip">${escapeHtml(column)} · ${count}</span>
        `).join("") || `<span class="info-chip">결측 없음</span>`}
      </div>
    </section>
  `;
}

function renderScoreBrief(result, validity, min, max) {
  const projection = result.interpretationInput;
  const highest = projection.scores.highest[0];
  const lowest = projection.scores.lowest[0];
  const overallPercent = scorePercent(result.scoring.overall.score, min, max);
  const headline = validity.className === "danger"
    ? "해석 보류가 필요합니다"
    : validity.className === "warning"
      ? "주의 문구와 함께 검토하세요"
      : "비진단 피드백 초안 생성 가능";

  return `
    <section class="report-hero score-hero">
      <div class="report-hero-main">
        <p class="eyebrow">Client Report Preview</p>
        <h3>${escapeHtml(headline)}</h3>
        <p>${escapeHtml(buildScoreSummary(highest, lowest))}</p>
      </div>
      <div class="report-hero-aside">
        <span>Overall</span>
        <strong>${formatNumber(result.scoring.overall.score)}</strong>
        ${renderBar(overallPercent)}
        <small>${escapeHtml(validity.description)}</small>
      </div>
    </section>
  `;
}

function renderScoreActionRail(result) {
  const projection = result.interpretationInput;
  const actions = [
    {
      title: "상담 문장 검토",
      meta: "non-diagnostic",
      body: "응답 패턴은 경향으로만 설명하고, 진단이나 선발 판단으로 확장하지 않습니다."
    },
    {
      title: "품질 플래그 확인",
      meta: result.validity.flag,
      body: result.validity.warnings.length > 0
        ? "주의 플래그가 있으므로 해석 전에 응답 품질을 먼저 확인하세요."
        : "현재 응답 패턴에서는 차단 수준의 품질 경고가 없습니다."
    },
    {
      title: "AI 전달 DTO",
      meta: projection.schemaVersion,
      body: "원응답 배열 없이 점수, 경계, 척도 출처만 전달하는 안전한 보고 입력입니다."
    }
  ];
  return renderActionRail("Report Workflow", actions);
}

function renderScoreCounselingPanel(result, min, max) {
  const projection = result.interpretationInput;
  const highest = projection.scores.highest[0];
  const lowest = projection.scores.lowest[0];
  const highBand = highest ? scoreBand(highest.score, min, max).label : "보류";
  const lowBand = lowest ? scoreBand(lowest.score, min, max).label : "보류";

  return `
    <section class="ai-panel">
      <div class="ai-panel-header">
        <div>
          <p class="eyebrow">AI Counseling Draft</p>
          <h3>상담 채팅 패널</h3>
        </div>
        <span>safe DTO</span>
      </div>
      <div class="ai-bubble-list">
        ${renderChatBubble("assistant", buildScoreSummary(highest, lowest))}
        ${renderChatBubble("assistant", highest
          ? `${highest.label} 점수는 ${formatNumber(highest.score)}점으로 ${highBand} 범주에 가깝습니다. 이 결과는 성향을 살펴보는 출발점으로만 사용하세요.`
          : "완료된 하위척도가 부족해 높은 경향을 요약하기 어렵습니다.")}
        ${renderChatBubble("user", lowest
          ? `대화 질문: ${lowest.label}이 ${lowBand}로 나타난 상황적 이유를 함께 확인해보세요.`
          : "대화 질문: 응답하지 않은 문항이 있는지 먼저 확인해보세요.")}
        ${renderChatBubble("guardrail", "이 패널은 점수를 다시 계산하지 않습니다. 결정론적 채점 결과를 설명하기 위한 문장 초안입니다.")}
      </div>
    </section>
  `;
}

function buildScoreSummary(highest, lowest) {
  if (!highest && !lowest) {
    return "채점 가능한 하위척도 결과가 아직 충분하지 않습니다.";
  }
  if (highest && lowest) {
    return `응답 패턴은 ${highest.label} 쪽이 상대적으로 두드러지고, ${lowest.label} 쪽은 낮게 나타난 편입니다.`;
  }
  return `${highest?.label ?? lowest?.label} 결과를 중심으로 응답 경향을 조심스럽게 살펴볼 수 있습니다.`;
}

function renderReportToolbar(actions) {
  return `
    <div class="report-toolbar" aria-label="Report actions">
      ${actions.map((action) => `
        <button type="button" class="report-tool" data-report-action="${escapeHtml(action.action)}">${escapeHtml(action.label)}</button>
      `).join("")}
    </div>
  `;
}

function renderActionRail(title, actions) {
  return `
    <section class="result-section action-rail">
      <div class="section-title-row">
        <h3>${escapeHtml(title)}</h3>
        <span class="count-badge">${actions.length}</span>
      </div>
      <div class="action-grid">
        ${actions.map((action, index) => `
          <article class="action-card">
            <div class="action-index">${index + 1}</div>
            <div>
              <strong>${escapeHtml(action.title)}</strong>
              <span>${escapeHtml(action.meta)}</span>
              <p>${escapeHtml(action.body)}</p>
            </div>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

function renderChatBubble(tone, message) {
  return `
    <article class="ai-bubble ${tone}">
      <span>${tone === "user" ? "Next question" : tone === "guardrail" ? "Boundary" : "Copilot"}</span>
      <p>${escapeHtml(message)}</p>
    </article>
  `;
}

function renderSubscale(id, subscale, min, max) {
  const percent = scorePercent(subscale.score, min, max);
  const band = scoreBand(subscale.score, min, max);
  return `
    <article class="subscale-row">
      <div>
        <strong>${escapeHtml(subscale.label)}</strong>
        <span>${escapeHtml(id)} · 응답 ${subscale.answeredItems}/${subscale.itemCount}</span>
      </div>
      <div class="subscale-score">
        <b>${formatNumber(subscale.score)} / ${max}</b>
        <em class="${band.className}">${band.label}</em>
      </div>
      ${renderBar(percent)}
    </article>
  `;
}

function renderEmptyScoreState() {
  nodes.resultPanel.innerHTML = renderMessage({
    title: "아직 결과가 없습니다",
    body: "왼쪽에서 데모 척도를 고르고 각 문항에 응답하면 채점 리포트가 여기에 표시됩니다.",
    tone: "neutral"
  });
}

function updateProgress() {
  const total = state.scale?.items.length ?? 0;
  const answered = Object.values(state.responses).filter((value) => Number.isFinite(value)).length;
  const ratio = total === 0 ? 0 : answered / total;
  nodes.progressText.textContent = `${answered} / ${total}`;
  nodes.progressBar.style.width = `${Math.round(ratio * 100)}%`;
}

function renderMetric(label, value, detail) {
  return `
    <article class="metric-card">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
      ${typeof detail === "string" && detail.includes("<")
        ? detail
        : `<p>${escapeHtml(detail)}</p>`}
    </article>
  `;
}

function renderBar(value) {
  const clamped = Math.max(0, Math.min(100, Number(value) || 0));
  return `
    <div class="score-track" aria-hidden="true">
      <span style="width:${clamped}%"></span>
    </div>
  `;
}

function renderMessage({ title, body, tone }) {
  return `
    <div class="empty-state ${tone}">
      <p class="eyebrow">Result</p>
      <h2>${escapeHtml(title)}</h2>
      <p>${escapeHtml(body)}</p>
    </div>
  `;
}

function completionRate(consultation) {
  const known = consultation.known.length;
  const unknown = consultation.uncertain.length;
  if (known + unknown === 0) {
    return 0;
  }
  return Math.round((known / (known + unknown)) * 100);
}

function scorePercent(score, min, max) {
  if (score === null || score === undefined) {
    return 0;
  }
  return Math.round(Math.max(0, Math.min(1, (score - min) / (max - min))) * 100);
}

function scoreBand(score, min, max) {
  if (score === null || score === undefined) {
    return { label: "보류", className: "band-pending" };
  }
  const rangeSize = max - min;
  if (score < min + rangeSize * 0.375) {
    return { label: "낮음", className: "band-low" };
  }
  if (score >= min + rangeSize * 0.625) {
    return { label: "높음", className: "band-high" };
  }
  return { label: "보통", className: "band-mid" };
}

function validityMeta(flag) {
  if (flag === "usable") {
    return {
      label: "사용 가능",
      className: "success",
      description: "응답 패턴에서 큰 이상 신호가 없습니다."
    };
  }
  if (flag === "caution") {
    return {
      label: "주의 필요",
      className: "warning",
      description: "일부 응답 패턴은 다시 확인하는 편이 좋습니다."
    };
  }
  return {
    label: "해석 보류",
    className: "danger",
    description: "응답 품질 문제로 결과 해석을 보류하는 편이 좋습니다."
  };
}

function formatWarning(warning) {
  if (warning.startsWith("Consistency-pair inconsistency")) {
    const value = warning.match(/\(([^)]+)\)/)?.[1];
    return `유사하거나 반대되는 문항 간 응답 일관성을 다시 확인하세요${value ? ` (${value})` : ""}.`;
  }
  if (warning.startsWith("Missing response rate")) {
    return warning.replace("Missing response rate", "누락 응답률");
  }
  if (warning.startsWith("Long-string response pattern")) {
    return warning.replace("Long-string response pattern", "동일 번호 반복 응답");
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

function responseLabel(value, scale) {
  if (value === scale.min) {
    return "낮음";
  }
  if (value === scale.max) {
    return "높음";
  }
  const midpoint = (scale.min + scale.max) / 2;
  return value === midpoint ? "중간" : "";
}

function formatScaleName(file) {
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

function formatNullableNumber(value) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "N/A";
  }
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function formatPercent(value) {
  return `${Math.round((Number(value) || 0) * 100)}%`;
}

function uploadSubscalePercent(subscale, scale) {
  if (subscale.method === "sum") {
    return scorePercent(subscale.score, scale.min * subscale.itemCount, scale.max * subscale.itemCount);
  }
  return scorePercent(subscale.score, scale.min, scale.max);
}

function numberOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function selectedUploadMappings() {
  return state.upload.mappings
    .filter((mapping) => mapping.include)
    .map((mapping) => ({
      ...mapping,
      factor: mapping.factor || "total"
    }));
}

function readUploadScale() {
  const min = numberOrNull(nodes.uploadScaleMinInput.value);
  const max = numberOrNull(nodes.uploadScaleMaxInput.value);
  if (min === null || max === null || min >= max) {
    throw new Error("응답 최솟값과 최댓값을 올바르게 입력하세요.");
  }
  return { min, max };
}

function parseNumericCell(value) {
  if (value === null || value === undefined || String(value).trim() === "") {
    return null;
  }
  const normalized = String(value).trim().replace(/,/g, "");
  const number = Number(normalized);
  return Number.isFinite(number) ? number : null;
}

function numericValues(values) {
  return values
    .map(parseNumericCell)
    .filter((value) => value !== null);
}

function summarizeScore(values, method) {
  if (values.length === 0) {
    return null;
  }
  return round(method === "sum"
    ? values.reduce((total, value) => total + value, 0)
    : mean(values));
}

function summarizeSubscaleScore(summary, method) {
  if (method === "sum") {
    const rowSums = summary.rows.map((row) => row.reduce((total, value) => total + value, 0));
    return rowSums.length > 0 ? round(mean(rowSums)) : null;
  }
  return summarizeScore(summary.values, "mean");
}

function mean(values) {
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function round(value, digits = 3) {
  return Number(value.toFixed(digits));
}

function splitList(value) {
  return value.split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function range(min, max) {
  return Array.from({ length: max - min + 1 }, (_, index) => min + index);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
