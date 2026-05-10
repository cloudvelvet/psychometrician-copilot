---
id: "kb_sem_non_normal_ordinal_reliability"
title: "SEM with nonnormal, binary, ordinal, or reliability-focused indicators needs estimator-aware interpretation"
relatedAnalyses: [ordinal_cfa, cfa, reliability_validity, data_screening]
keywords: [nonnormal indicators, ordinal indicators, binary indicators, categorical CFA, robust estimator, WLSMV, higher-order factor, SEM reliability, discriminant validity, 비정규 지표변수, 이분형 자료, 순위형 자료, 범주형 CFA, 강건추정, 고차 요인분석, 측정모형 신뢰도, 차별타당성]
sourceCitation: "김수영 (2016). 구조방정식 모형의 기본과 확장: Mplus 예제와 함께. 학지사."
sourceType: "book_toc_guided_summary"
sourceNote: "Paraphrased SEM knowledge note guided by the book title and table of contents; no source text reproduction."
---

## Summary

When indicators are nonnormal, binary, ordinal, or used to support reliability/validity claims, SEM output must be interpreted through estimator choice, threshold/category diagnostics, higher-order structure, and discriminant-validity evidence.

## Checks

- Match estimator and link functions to binary or ordinal indicators rather than defaulting to continuous ML.
- Examine whether higher-order factor models are theoretically justified and empirically identified.
- Report SEM-based reliability and discriminant-validity evidence with assumptions, not as automatic pass/fail rules.

## Use When

- The user has Likert, binary, or nonnormal indicators in SEM.
- The user asks for reliability, higher-order factors, or discriminant validity from CFA/SEM.
