import { createCopilotConsultation } from "../src/copilot.js";
import { scoreAssessment } from "../src/score.js";

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
  groups: ["female", "male"]
};

const state = {
  mode: "consult",
  scale: null,
  responses: {}
};

const nodes = {
  assessmentForm: document.querySelector("#assessmentForm"),
  consultForm: document.querySelector("#consultForm"),
  constructInput: document.querySelector("#constructInput"),
  expectedFactorsInput: document.querySelector("#expectedFactorsInput"),
  groupComparisonInput: document.querySelector("#groupComparisonInput"),
  groupsInput: document.querySelector("#groupsInput"),
  groupVariableInput: document.querySelector("#groupVariableInput"),
  intendedUseInput: document.querySelector("#intendedUseInput"),
  itemCountInput: document.querySelector("#itemCountInput"),
  itemTypeInput: document.querySelector("#itemTypeInput"),
  progressBar: document.querySelector("#progressBar"),
  progressText: document.querySelector("#progressText"),
  purposeInput: document.querySelector("#purposeInput"),
  resetButton: document.querySelector("#resetButton"),
  resultPanel: document.querySelector("#resultPanel"),
  sampleConsultButton: document.querySelector("#sampleConsultButton"),
  sampleSizeInput: document.querySelector("#sampleSizeInput"),
  scaleMaxInput: document.querySelector("#scaleMaxInput"),
  scaleMeta: document.querySelector("#scaleMeta"),
  scaleMinInput: document.querySelector("#scaleMinInput"),
  scaleSelect: document.querySelector("#scaleSelect"),
  scaleTitle: document.querySelector("#scaleTitle"),
  scoreButton: document.querySelector("#scoreButton"),
  tabButtons: [...document.querySelectorAll(".tab-button")]
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
  } else if (state.scale) {
    renderEmptyScoreState();
  }
}

function wireConsultation() {
  nodes.sampleConsultButton.addEventListener("click", () => {
    fillConsultationForm(SAMPLE_CONTEXT);
    renderConsultation();
  });

  nodes.consultForm.addEventListener("submit", (event) => {
    event.preventDefault();
    renderConsultation();
    focusResultPanel();
  });

  nodes.groupComparisonInput.addEventListener("change", () => {
    nodes.groupVariableInput.disabled = !nodes.groupComparisonInput.checked;
    nodes.groupsInput.disabled = !nodes.groupComparisonInput.checked;
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
  if (action === "edit_answers") {
    setMode("score");
    document.querySelector("#scoreMode")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

async function copyReportBrief(button) {
  const originalLabel = button.textContent;
  const text = nodes.resultPanel.querySelector(".report-hero")?.textContent?.trim() ?? "";
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
  nodes.groupVariableInput.disabled = !nodes.groupComparisonInput.checked;
  nodes.groupsInput.disabled = !nodes.groupComparisonInput.checked;
}

function readConsultationForm() {
  const min = numberOrNull(nodes.scaleMinInput.value);
  const max = numberOrNull(nodes.scaleMaxInput.value);
  return {
    purpose: nodes.purposeInput.value,
    construct: nodes.constructInput.value,
    intendedUse: nodes.intendedUseInput.value,
    itemType: nodes.itemTypeInput.value,
    responseScale: min !== null && max !== null ? { min, max } : null,
    itemCount: numberOrNull(nodes.itemCountInput.value),
    sampleSize: numberOrNull(nodes.sampleSizeInput.value),
    expectedFactors: numberOrNull(nodes.expectedFactorsInput.value),
    groupComparison: nodes.groupComparisonInput.checked,
    groupVariable: nodes.groupComparisonInput.checked ? nodes.groupVariableInput.value : "",
    groups: nodes.groupComparisonInput.checked ? splitList(nodes.groupsInput.value) : []
  };
}

function renderConsultation() {
  const consultation = createCopilotConsultation(readConsultationForm());
  const warnings = consultation.critic.warnings;
  const errors = warnings.filter((warning) => warning.severity === "error").length;
  const flags = warnings.filter((warning) => warning.severity === "flag").length;
  const completion = completionRate(consultation);

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
        { label: "근거 보기", action: "jump_to_evidence" },
        { label: "PDF 저장", action: "export_report" },
        { label: "입력 수정", action: "edit_inputs" }
      ])}

      <section class="metric-grid">
        ${renderMetric("입력 완성도", `${completion}%`, renderBar(completion))}
        ${renderMetric("추천 분석", `${consultation.recommendedAnalyses.length}개`, "CFA · IRT · DIF")}
        ${renderMetric("근거 토픽", `${consultation.evidence.length}개`, "local registry")}
        ${renderMetric("경고", `${errors} error · ${flags} flag`, "critic review")}
      </section>

      ${renderConsultationBrief(consultation, { completion, errors, flags })}
      ${renderConsultationActionRail(consultation)}
      ${renderConsultationChat(consultation)}
      ${renderMissingInfo(consultation)}
      ${renderWarnings(consultation.critic.warnings)}
      ${renderAnalysisRoadmap(consultation.recommendedAnalyses)}
      ${renderEvidenceTopics(consultation.evidence)}
      ${renderCodeTemplates(consultation.codeTemplates)}
    </article>
  `;
}

function renderConsultationBrief(consultation, { completion, errors, flags }) {
  const primary = consultation.recommendedAnalyses[0];
  const missing = consultation.uncertain.length;
  const verdict = errors > 0
    ? "검토 후 진행"
    : flags > 0
      ? "전문가 검토 필요"
      : "보고 준비 가능";
  const summary = primary
    ? `현재 설계에서는 ${primary.title}을 먼저 고정하고, 그 다음 분석을 단계적으로 연결하는 흐름이 가장 안전합니다.`
    : "현재 입력만으로는 추천 분석을 확정하기 어렵습니다. 핵심 설계 정보를 먼저 보강하세요.";

  return `
    <section class="report-hero">
      <div class="report-hero-main">
        <p class="eyebrow">Executive Brief</p>
        <h3>${escapeHtml(verdict)}</h3>
        <p>${escapeHtml(summary)}</p>
      </div>
      <div class="report-hero-aside">
        <span>Readiness</span>
        <strong>${completion}%</strong>
        ${renderBar(completion)}
        <small>${missing === 0 ? "필수 설계 정보가 채워졌습니다." : `${missing}개 설계 정보가 더 필요합니다.`}</small>
      </div>
    </section>
  `;
}

function renderConsultationActionRail(consultation) {
  const actions = consultation.recommendedAnalyses.slice(0, 3).map((analysis) => ({
    title: analysis.title,
    meta: `${analysis.priority} priority · ${analysis.confidence} confidence`,
    body: analysis.output
  }));
  return renderActionRail("Next Best Actions", actions);
}

function renderConsultationChat(consultation) {
  const nextQuestion = consultation.critic.nextQuestions[0] ?? "원자료의 결측, 범주 분포, 집단별 표본 크기를 확인하세요.";
  const guidance = consultation.reportingGuidance[0] ?? "관찰된 결과와 구성개념 해석을 분리해서 보고하세요.";
  const boundary = consultation.agentBoundaries[0];

  return `
    <section class="ai-panel">
      <div class="ai-panel-header">
        <div>
          <p class="eyebrow">AI Consultation Draft</p>
          <h3>상담 문장 카드</h3>
        </div>
        <span>deterministic</span>
      </div>
      <div class="ai-bubble-list">
        ${renderChatBubble("assistant", "현재 입력만 보면 분석 계획은 바로 확정하기보다, 데이터 스크리닝과 측정모형 확인을 먼저 고정하는 쪽이 좋습니다.")}
        ${renderChatBubble("assistant", guidance)}
        ${renderChatBubble("user", `다음에 확인할 질문: ${nextQuestion}`)}
        ${renderChatBubble("guardrail", boundary)}
      </div>
    </section>
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
    <section class="result-section">
      <h3>근거 토픽</h3>
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
    <section class="result-section">
      <h3>비판자 경고</h3>
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

function numberOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
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
