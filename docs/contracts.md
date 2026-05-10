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
