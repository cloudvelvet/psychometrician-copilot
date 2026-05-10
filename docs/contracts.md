# Engine Contracts

This MVP separates four boundaries so an AI agent can explain results without becoming the scorer.

## 1. Scale Registry

Scale definitions are versioned JSON files. Required fields:

- `id`, `name`, and preferably `version`
- `responseScale.min` and `responseScale.max`
- `items[].id`
- `items[].reverse`
- `subscales`

Optional fields:

- `items[].responseScale` for item-specific bounds
- `items[].excludeFromScoring` for attention or metadata items
- `items[].attentionCheck.expected`
- `consistencyPairs`
- `validity.thresholds`
- `measurementStatus`
- `notice`

Reverse scoring always uses the item-specific bounds when present:

```text
reversed = itemMin + itemMax - raw
```

## 2. Respondent Scoring

`scoreAssessment(scale, responses)` returns item scores, subscale scores, overall score, validity results, and an AI projection.

Reliability statistics are intentionally excluded from respondent scoring. Cronbach alpha is a cohort-level function under `cronbachAlphaForScale`.

## 3. Validity Evaluation

Validity output includes:

- `flag`: `usable`, `caution`, or `invalid`
- `warnings`: human-readable warnings
- `checks`: typed machine-readable events
- `metrics`: raw supporting metrics

Check severities:

- `error`: blocks confident use of the result
- `flag`: usable only with caution
- `info`: observable but not a warning

Check sources:

- `generic`: applies across scales
- `scale`: configured by the scale, such as attention checks or consistency pairs

## 4. AI Projection

`projectForAI` produces a frozen DTO with:

- scale provenance
- non-diagnostic marker
- caveat notice
- subscale scores
- validity warnings
- reporting boundaries

It intentionally omits raw response arrays and does not expose scoring metadata that would invite an LLM to recalculate results.

## 5. Copilot Consultation

`createCopilotConsultation(studyContext)` is a separate planning surface from respondent scoring.

It consumes explicit study-design context such as:

- research purpose and construct definition
- intended score use
- item type and response scale
- item count and sample size
- expected factor count and item IDs
- group-comparison needs, including an explicit grouping-variable column
- missing-data and distribution notes

It returns `psychometric_copilot_v1` with:

- `known`
- `assumptions`
- `uncertain`
- `recommendedAnalyses`
- `alternatives`
- `evidence`
- `codeTemplates`
- `reportingGuidance`
- `limitations`
- `critic`

This DTO should not be merged into `interpretationInput`. The respondent-result DTO answers "what did this person score?", while the copilot DTO answers "what analysis plan is defensible for this study context?"

## 6. Knowledge Registry

The local knowledge registry has two layers:

- `psychometrics_kb/**/*.md` for human-authored, topic-organized source notes
- `knowledge/topics.js` and generated modules for browser-readable cards

Run `npm run kb:build` after editing Markdown knowledge notes.

Each topic is an auditable card with:

- `id`
- `title`
- `relatedAnalyses`
- `keywords`
- `summary`
- `checks`
- `useWhen`

`retrieveKnowledge()` ranks those cards against the explicit study context and the generated recommendation IDs. This is not model fine-tuning; it is deterministic retrieval from a small expert-maintained registry. A future vector/RAG layer can replace retrieval while keeping the same consultation contract.
