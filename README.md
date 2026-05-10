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
npm run assess
```

On Windows PowerShell, use `cmd /c npm test`, `cmd /c npm run demo`, or `cmd /c npm run assess` if script execution policy blocks `npm.ps1`.

No third-party packages are required.

`npm run assess` is the interactive runner. It lets you choose a demo scale and answer each item from the terminal.

PowerShell-friendly commands:

```powershell
cd C:\ai\psychometric-engine
npm.cmd run assess
npm.cmd run assess -- --json
npm.cmd run assess -- --no-color
```

The default `assess` output is a readable terminal report with boxes, score bars, and color when the terminal supports it. Use `-- --json` only when you want the raw AI projection DTO, and `-- --no-color` when plain output is easier to copy.

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

## Reliability Notes

Cronbach alpha is a cohort-level statistic. It is not meaningful for one person's result. Use `cronbachAlphaForScale` only after enough complete respondent records have accumulated.

## Production Notes

The included scales are demo templates, not validated instruments. Before real use:

- replace demo items with validated or licensed scales
- review consent, privacy, storage, and deletion flows
- run reliability and validity studies on your target population
- add bias and adverse-impact review for HR or hiring contexts
- route crisis or self-harm language to a separate safety workflow
