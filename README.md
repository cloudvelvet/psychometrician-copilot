# Psychometric Engine MVP

Deterministic psychometric scoring engine for AI-agent workflows. The core rule is simple: the engine calculates scores; the AI agent only explains structured results.

## What It Does

- Item scoring with Likert range validation
- Reverse scoring with `min + max - raw`
- Item-specific response bounds
- Subscale scoring with `mean` or `sum`
- Missing-response handling with `minAnsweredRatio`
- Validity checks:
  - missing rate
  - long-string response patterns
  - response variance
  - extreme response rate
  - attention checks
  - consistency pairs
- Cohort reliability helper:
  - Cronbach alpha
- Psychometrician Copilot consultation:
  - known facts, assumptions, and missing design facts
  - method recommendations for EFA/CFA/IRT/DIF/invariance
  - local knowledge-topic retrieval
  - R code templates for lavaan, psych, mirt, and semTools
  - deterministic critic warnings
- AI-facing projection DTO:
  - non-diagnostic marker
  - scale provenance
  - caveats
  - no raw response array
- Demo scales:
  - Big Five
  - stress
  - burnout
  - affect state
  - job fit

## Run

```bash
npm test
npm run demo
npm run consult
npm run assess
npm run web
```

On Windows PowerShell, use `cmd /c npm test`, `cmd /c npm run demo`, `cmd /c npm run consult`, `cmd /c npm run assess`, or `cmd /c npm run web` if script execution policy blocks `npm.ps1`.

No third-party packages are required.

`npm run assess` is the interactive runner. It lets you choose a demo scale and answer each item from the terminal.

`npm run consult` runs a sample Psychometrician Copilot consultation. Use `npm run consult -- --json` to inspect the full DTO, including generated code templates. Use `npm run consult -- --file study-context.json` to provide your own study context.

PowerShell-friendly commands:

```powershell
cd C:\ai\psychometric-engine
npm.cmd run assess
npm.cmd run assess -- --json
npm.cmd run assess -- --no-color
```

The default `assess` output is a readable terminal report with boxes, score bars, and color when the terminal supports it. Use `-- --json` only when you want the raw AI projection DTO, and `-- --no-color` when plain output is easier to copy.

## Web Preview

This repository includes a static browser app.

```powershell
cd C:\ai\psychometric-engine
npm.cmd run web
```

Open `http://localhost:4173` to test the browser UI.

## GitHub Pages

GitHub Pages deployment is configured through `.github/workflows/pages.yml`.

1. Push this project to a GitHub repository.
2. In GitHub, open `Settings -> Pages`.
3. Set `Source` to `GitHub Actions`.
4. Push to the `main` branch, or run the `Deploy GitHub Pages` workflow manually.

The workflow runs `npm run build`, uploads `public/`, and publishes the static app. The app uses relative asset paths so it works under repository URLs such as:

```text
https://username.github.io/repository-name/
```

If your default branch is not `main`, update `.github/workflows/pages.yml`.

## Minimal Usage

```js
import { loadScale, scoreAssessment } from "./src/index.js";

const scale = await loadScale("./scales/big-five-demo.json");

const result = scoreAssessment(scale, {
  bf_o_1: 5,
  bf_o_2: 2,
  bf_c_1: 4,
  bf_c_2: 2,
  bf_e_1: 3,
  bf_e_2: 4,
  bf_a_1: 5,
  bf_a_2: 2,
  bf_n_1: 4,
  bf_n_2: 2,
  bf_attention_1: 3
});

console.log(result.interpretationInput);
```

The lower-level API is split intentionally:

- `scoreAssessment(scale, responses)` for one respondent
- `evaluateValidity(scale, responseMap, itemScores)` for respondent validity
- `cronbachAlphaForScale(scale, respondentResponses)` for cohort reliability
- `projectForAI(result, scale)` for LLM-safe report input
- `createCopilotConsultation(studyContext)` for psychometric analysis planning

## Scale Definition Shape

```json
{
  "id": "scale_id",
  "name": "Scale Name",
  "responseScale": { "min": 1, "max": 5 },
  "items": [
    {
      "id": "item_1",
      "text": "Item text",
      "factor": "subscale_id",
      "reverse": false,
      "responseScale": { "min": 1, "max": 5 }
    }
  ],
  "subscales": {
    "subscale_id": {
      "label": "Subscale label",
      "method": "mean",
      "items": ["item_1"]
    }
  }
}
```

See `docs/contracts.md` for the contract boundaries.

## AI Agent Boundary

Pass `result.interpretationInput` to the AI agent. Do not ask the AI agent to calculate, modify, or infer scores.

Recommended report language:

- "This response pattern suggests a tendency toward ..."
- "Use this result as a starting point for reflection and conversation."
- "Do not use this as a clinical diagnosis or treatment recommendation."

Avoid:

- "You have depression."
- "This score means hire/reject."
- "The AI adjusted the score."

For study-design consultation, pass an explicit study context to `createCopilotConsultation` instead of overloading respondent scores:

```js
import { createCopilotConsultation } from "./src/index.js";

const consultation = createCopilotConsultation({
  purpose: "Evaluate a 3-factor Likert questionnaire",
  construct: "workplace wellbeing",
  intendedUse: "research report",
  responseScale: { min: 1, max: 5 },
  itemCount: 18,
  sampleSize: 320,
  expectedFactors: 3,
  groupComparison: true,
  groupVariable: "group_id",
  groups: ["group_a", "group_b"]
});

console.log(consultation.recommendedAnalyses);
```

## Reliability Notes

Cronbach alpha is a cohort-level statistic. It is not meaningful for one person's result. Use `cronbachAlphaForScale` only after enough complete respondent records have accumulated.

## Production Notes

The included scales are demo templates, not validated instruments. Before real use:

- replace demo items with validated or licensed scales
- review consent, privacy, storage, and deletion flows
- run reliability and validity studies on your target population
- add bias and adverse-impact review for HR or hiring contexts
- route crisis or self-harm language to a separate safety workflow
