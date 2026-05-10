import { scoreAssessment } from "../src/score.js";

const SCALE_FILES = [
  "affect-state-demo.json",
  "big-five-demo.json",
  "burnout-brief-demo.json",
  "job-fit-demo.json",
  "stress-brief-demo.json"
];

const state = {
  scale: null,
  responses: {}
};

const nodes = {
  form: document.querySelector("#assessmentForm"),
  progressBar: document.querySelector("#progressBar"),
  progressText: document.querySelector("#progressText"),
  resetButton: document.querySelector("#resetButton"),
  resultPanel: document.querySelector("#resultPanel"),
  scaleMeta: document.querySelector("#scaleMeta"),
  scaleSelect: document.querySelector("#scaleSelect"),
  scaleTitle: document.querySelector("#scaleTitle"),
  scoreButton: document.querySelector("#scoreButton")
};

init().catch((error) => {
  nodes.resultPanel.innerHTML = `
    <div class="empty-state error">
      <p class="eyebrow">Error</p>
      <h2>앱을 불러오지 못했습니다</h2>
      <p>${escapeHtml(error.message)}</p>
    </div>
  `;
});

async function init() {
  nodes.scaleSelect.innerHTML = SCALE_FILES
    .map((file) => `<option value="${file}">${formatScaleName(file)}</option>`)
    .join("");

  nodes.scaleSelect.addEventListener("change", () => loadSelectedScale());
  nodes.resetButton.addEventListener("click", () => resetResponses());
  nodes.scoreButton.addEventListener("click", () => showResult());
  nodes.form.addEventListener("change", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) {
      return;
    }
    state.responses[target.name] = Number(target.value);
    updateProgress();
  });

  await loadSelectedScale();
}

async function loadSelectedScale() {
  const file = nodes.scaleSelect.value || SCALE_FILES[0];
  const response = await fetch(`/scales/${file}`);
  if (!response.ok) {
    throw new Error(`Scale fetch failed: ${response.status}`);
  }

  state.scale = await response.json();
  state.responses = {};
  renderScale();
  renderEmptyResult();
  updateProgress();
}

function renderScale() {
  const scale = state.scale;
  nodes.scaleTitle.textContent = scale.name;
  nodes.scaleMeta.textContent = `${scale.id} · ${scale.version ?? "unversioned"}`;

  nodes.form.innerHTML = scale.items.map((item, index) => {
    const itemScale = item.responseScale ?? scale.responseScale;
    const labels = scale.responseScale.labels ?? {};
    const options = range(itemScale.min, itemScale.max)
      .map((value) => `
        <label class="choice">
          <input type="radio" name="${item.id}" value="${value}">
          <span>${value}</span>
          <small>${escapeHtml(labels[String(value)] ?? "")}</small>
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
  nodes.form.reset();
  renderEmptyResult();
  updateProgress();
}

function showResult() {
  const result = scoreAssessment(state.scale, state.responses);
  const scaleMin = result.scoring.responseScale.min;
  const scaleMax = result.scoring.responseScale.max;
  const subscales = Object.entries(result.scoring.subscales);
  const validity = validityMeta(result.validity.flag);
  const warnings = result.validity.warnings.map(formatWarning);

  nodes.resultPanel.innerHTML = `
    <article class="report">
      <header class="report-header">
        <div>
          <p class="eyebrow">결과 리포트</p>
          <h2>${escapeHtml(result.scaleName)}</h2>
        </div>
        <span class="pill ${validity.className}">${validity.label}</span>
      </header>

      <section class="summary-grid">
        <div class="metric">
          <span>전체 평균</span>
          <strong>${formatNumber(result.scoring.overall.score)} / ${scaleMax}</strong>
          ${scoreBar(result.scoring.overall.score, scaleMin, scaleMax)}
        </div>
        <div class="metric">
          <span>응답 상태</span>
          <strong>${result.validity.flag}</strong>
          <p>${validity.description}</p>
        </div>
      </section>

      ${warnings.length > 0 ? `
        <section class="warning-box">
          <h3>주의해서 볼 점</h3>
          <ul>${warnings.map((warning) => `<li>${escapeHtml(warning)}</li>`).join("")}</ul>
        </section>
      ` : ""}

      <section>
        <h3>하위요인</h3>
        <div class="subscale-list">
          ${subscales.map(([id, subscale]) => renderSubscale(id, subscale, scaleMin, scaleMax)).join("")}
        </div>
      </section>

      <section class="interpretation">
        <h3>해석 가이드</h3>
        <p>이 결과는 진단이 아니라 응답 경향을 정리한 참고 자료입니다. 실제 서비스에서는 검증되거나 라이선스가 확보된 척도와 개인정보 보호 설계를 연결해야 합니다.</p>
      </section>
    </article>
  `;
}

function renderSubscale(id, subscale, min, max) {
  const band = scoreBand(subscale.score, min, max);
  return `
    <div class="subscale-row">
      <div>
        <strong>${escapeHtml(subscale.label)}</strong>
        <span>${escapeHtml(id)} · 응답 ${subscale.answeredItems}/${subscale.itemCount}</span>
      </div>
      <div class="subscale-score">
        <b>${formatNumber(subscale.score)} / ${max}</b>
        <em class="${band.className}">${band.label}</em>
      </div>
      ${scoreBar(subscale.score, min, max)}
    </div>
  `;
}

function renderEmptyResult() {
  nodes.resultPanel.innerHTML = `
    <div class="empty-state">
      <p class="eyebrow">Result</p>
      <h2>아직 결과가 없습니다</h2>
      <p>문항에 응답한 뒤 결과를 확인하세요.</p>
    </div>
  `;
}

function updateProgress() {
  const total = state.scale?.items.length ?? 0;
  const answered = Object.values(state.responses).filter((value) => Number.isFinite(value)).length;
  const ratio = total === 0 ? 0 : answered / total;
  nodes.progressText.textContent = `${answered} / ${total}`;
  nodes.progressBar.style.width = `${Math.round(ratio * 100)}%`;
}

function scoreBar(score, min, max) {
  const ratio = score === null || score === undefined
    ? 0
    : Math.max(0, Math.min(1, (score - min) / (max - min)));
  return `
    <div class="score-track" aria-hidden="true">
      <span style="width:${Math.round(ratio * 100)}%"></span>
    </div>
  `;
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
      className: "pill-success",
      description: "응답 패턴에 큰 이상 신호가 없습니다."
    };
  }
  if (flag === "caution") {
    return {
      label: "주의 필요",
      className: "pill-warning",
      description: "일부 응답 패턴은 다시 확인하는 편이 좋습니다."
    };
  }
  return {
    label: "해석 보류",
    className: "pill-danger",
    description: "응답 품질 문제로 결과 해석을 보류하는 편이 좋습니다."
  };
}

function formatWarning(warning) {
  if (warning.startsWith("Consistency-pair inconsistency")) {
    const value = warning.match(/\(([^)]+)\)/)?.[1];
    return `응답 일관성 확인 필요: 유사하거나 반대되는 문항 일부가 서로 맞지 않습니다${value ? ` (${value})` : ""}.`;
  }
  return warning;
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
