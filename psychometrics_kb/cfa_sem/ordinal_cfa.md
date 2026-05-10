---
id: "kb_ordinal_cfa"
title: "Ordinal CFA is often appropriate for limited Likert categories"
relatedAnalyses: [ordinal_cfa, cfa, data_screening]
keywords: [ordinal CFA, Likert, WLSMV, DWLS, polychoric, thresholds, categorical indicators, ordered items, 순서형 CFA, 리커트, 다분범주, 다분상관, 임계값]
sourceCitation: "Psychometrics KB curation"
sourceType: "kb_note"
---

## Summary

Likert items with limited categories often need ordinal-aware modeling, especially when categories are sparse, skewed, or unevenly used. The estimator choice should follow response diagnostics rather than convenience.

## Checks

- Inspect category frequencies and missingness before model estimation.
- Treat item IDs as ordered indicators when using ordinal CFA templates.
- Report estimator choice and thresholds along with fit and loadings.

## Use When

- The response scale has five to seven or fewer ordered categories.
- The user asks for CFA on Likert questionnaire data.
