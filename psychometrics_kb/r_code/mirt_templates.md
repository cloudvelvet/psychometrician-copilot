---
id: "kb_mirt_templates"
title: "mirt templates should require response format and dimensionality checks"
relatedAnalyses: [irt_polytomous, irt_binary]
keywords: [mirt, IRT code, graded response model, GPCM, Rasch, itemfit, M2, item information, R template, 분석 코드, 문항반응이론 코드, 등급반응모형 코드]
sourceCitation: "Psychometrics KB curation"
sourceType: "code_guidance"
---

## Summary

mirt templates should be selected by item response format and dimensionality evidence. A graded response template is suitable for ordered categories, while binary models need dichotomous items and different interpretation.

## Checks

- Confirm whether items are binary or ordered polytomous before choosing item type.
- Check dimensionality and local dependence before interpreting parameters.
- Report item fit, thresholds or difficulties, discrimination, and information with caveats.

## Use When

- The consultation generates IRT R code.
- The user asks for mirt-based item diagnostics.
