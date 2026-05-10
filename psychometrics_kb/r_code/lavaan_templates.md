---
id: "kb_lavaan_templates"
title: "lavaan templates should stay tied to explicit model assumptions"
relatedAnalyses: [ordinal_cfa, cfa, measurement_invariance]
keywords: [lavaan, CFA code, SEM code, WLSMV, ordered items, measurementInvariance, R template, 분석 코드, R 코드, 확인적 요인분석 코드, 측정동일성 코드]
sourceCitation: "Psychometrics KB curation"
sourceType: "code_guidance"
---

## Summary

lavaan code templates are useful only when the item-to-factor map, ordered item handling, missing-data rule, grouping variable, and model-comparison plan are explicit. Generated code should be a starting point, not hidden analysis authority.

## Checks

- Replace placeholder item IDs and data frame names before execution.
- Match estimator and ordered-item arguments to the response format.
- Report any model modifications separately from the initial hypothesized model.

## Use When

- The consultation generates CFA or measurement-invariance R code.
- The user asks for reproducible lavaan analysis templates.
