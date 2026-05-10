export function createStudyPacket(consultation) {
  const context = consultation.context ?? {};
  return deepFreeze({
    schemaVersion: "study_packet_v1",
    deterministic: true,
    completion: completionRate(consultation),
    designSummary: buildDesignSummary(context),
    knownFacts: (consultation.known ?? []).map((fact) => ({
      label: fact.label,
      value: fact.value
    })),
    assumptions: [...(consultation.assumptions ?? [])],
    variableManifest: buildVariableManifest(context),
    itemFactorMap: buildItemFactorMap(context),
    analysisSequence: (consultation.recommendedAnalyses ?? []).map((analysis, index) => ({
      step: index + 1,
      title: analysis.title,
      priority: analysis.priority,
      confidence: analysis.confidence,
      output: analysis.output
    })),
    missingInformation: (consultation.uncertain ?? []).map((item) => item.question),
    reportingChecklist: buildReportingChecklist(consultation),
    codeTemplates: [...(consultation.codeTemplates ?? [])],
    nextInputs: buildNextInputs(consultation),
    boundaryChecklist: buildBoundaryChecklist(consultation)
  });
}

function buildDesignSummary(context) {
  return [
    {
      label: "연구 설계",
      value: context.purpose ?? "미입력",
      detail: context.construct ? `구성개념: ${context.construct}` : "구성개념 정의 필요",
      state: context.purpose && context.construct ? "known" : "missing"
    },
    {
      label: "점수 사용",
      value: context.intendedUse ?? "미입력",
      detail: context.highStakes ? "고위험 사용: 별도 검토 필요" : "비진단·연구용 경계 유지",
      state: context.intendedUse ? "known" : "missing"
    },
    {
      label: "문항/척도",
      value: context.itemCount ? `${context.itemCount}문항` : "문항 수 미입력",
      detail: context.responseScale
        ? `${context.itemType} · ${context.responseScale.min}-${context.responseScale.max}점 · ${context.responseScale.categories} categories`
        : `${context.itemType} · 응답척도 미입력`,
      state: context.itemCount && context.responseScale ? "known" : "missing"
    },
    {
      label: "표본/요인",
      value: context.sampleSize ? `N=${context.sampleSize}` : "N 미입력",
      detail: context.expectedFactors ? `${context.expectedFactors}요인 가설` : "요인 수 미입력",
      state: context.sampleSize && context.expectedFactors ? "known" : "missing"
    },
    {
      label: "집단 비교",
      value: context.groupComparison ? "필요" : "해당 없음",
      detail: context.groupComparison
        ? `${context.groupVariable ?? "group_id 필요"} · ${context.groups?.length > 0 ? context.groups.join(", ") : "집단명/크기 필요"}`
        : "측정동일성/DIF는 선택 항목",
      state: context.groupComparison && (!context.groupVariableProvided || (context.groups?.length ?? 0) < 2) ? "attention" : "known"
    }
  ];
}

function buildVariableManifest(context) {
  const itemRange = context.itemIds?.length > 0
    ? summarizeItemIds(context.itemIds)
    : "item columns";
  const rows = [
    {
      name: itemRange,
      role: "문항 응답",
      type: context.itemType ?? "unknown",
      status: context.itemIds?.length > 0 ? "required" : "missing",
      note: context.itemIdsGenerated
        ? "임시 item ID입니다. 실제 데이터 컬럼명으로 교체하세요."
        : "실제 문항 컬럼과 역채점 여부를 확인하세요."
    },
    {
      name: "respondent_id",
      role: "사례 식별자",
      type: "identifier",
      status: "recommended",
      note: "중복 응답, 결측 패턴, 제외 기준 추적에 사용합니다."
    },
    {
      name: "missingness_flags",
      role: "자료 품질",
      type: "derived",
      status: "recommended",
      note: "문항별·응답자별 결측률과 제외 기준을 기록합니다."
    }
  ];

  if (context.groupComparison || context.groupVariable) {
    rows.push({
      name: context.groupVariable ?? "group_id",
      role: "집단 변수",
      type: "categorical",
      status: context.groupVariableProvided ? "required" : "missing",
      note: "집단 비교, 측정동일성, DIF 검토 전에 집단별 N을 확인하세요."
    });
  }

  return rows;
}

function buildItemFactorMap(context) {
  if (!context.itemIds || context.itemIds.length === 0) {
    return [];
  }

  const factorLabels = context.expectedFactors
    ? range(1, context.expectedFactors).map((index) => `factor_${index}`)
    : ["factor_pending"];
  const itemsPerFactor = Math.ceil(context.itemIds.length / factorLabels.length);
  const placeholder = context.itemIdsGenerated || !context.expectedFactors;

  return context.itemIds.map((item, index) => {
    const factorIndex = Math.min(factorLabels.length - 1, Math.floor(index / itemsPerFactor));
    return {
      item,
      factor: factorLabels[factorIndex],
      status: placeholder ? "템플릿" : "확인 필요",
      direction: "정방향 가정",
      note: placeholder
        ? "placeholder mapping: 실제 문항-요인표와 역채점 정보로 교체하세요."
        : "요인 배정과 역채점 여부를 연구자가 확인하세요."
    };
  });
}

function buildReportingChecklist(consultation) {
  return uniqueStrings([
    "연구 목적, 구성개념 정의, 점수 사용 목적을 먼저 보고한다.",
    "문항 형식, 응답척도, 표본 수, 제외 기준을 명시한다.",
    "결측 처리 계획과 범주 분포 점검 결과를 보고한다.",
    "신뢰도 계수는 하위척도, 표본, 가정과 함께 해석한다.",
    "집단 비교는 측정동일성 및 DIF 검토 후 제한적으로 보고한다.",
    "R 코드, 패키지, 분석 순서, 모델 수정 결정을 재현 가능하게 남긴다.",
    ...(consultation.reportingGuidance ?? [])
  ]).slice(0, 8);
}

function buildNextInputs(consultation) {
  const context = consultation.context ?? {};
  const prompts = [
    ...(consultation.critic?.nextQuestions ?? [])
  ];

  if (context.itemIdsGenerated) {
    prompts.push("실제 데이터의 문항 컬럼명을 입력하세요.");
  }
  if (context.itemIds?.length > 0) {
    prompts.push("각 문항의 실제 요인 배정과 역채점 여부를 입력하세요.");
  }
  if (!context.missingData) {
    prompts.push("결측률, 결측 패턴, 결측 처리 기준을 입력하세요.");
  }
  if (!context.distribution) {
    prompts.push("문항별 응답 범주 분포와 희소 범주 여부를 입력하세요.");
  }
  if (context.groupComparison) {
    prompts.push("집단별 표본 크기와 집단 변수 코딩 방식을 입력하세요.");
  }

  return uniqueStrings(prompts).slice(0, 8);
}

function buildBoundaryChecklist(consultation) {
  return uniqueStrings([
    "이 패킷은 연구 계획 산출물이며 R 코드 실행 결과가 아닙니다.",
    "문항-요인 매핑과 역채점 정보는 연구자가 실제 설문지와 데이터 사전으로 확정해야 합니다.",
    ...(consultation.limitations ?? []),
    ...(consultation.agentBoundaries ?? []),
    ...(consultation.critic?.mustNotDo ?? [])
  ]).slice(0, 10);
}

function completionRate(consultation) {
  const known = consultation.known?.length ?? 0;
  const unknown = consultation.uncertain?.length ?? 0;
  if (known + unknown === 0) {
    return 0;
  }
  return Math.round((known / (known + unknown)) * 100);
}

function summarizeItemIds(itemIds) {
  if (itemIds.length <= 6) {
    return itemIds.join(", ");
  }
  return `${itemIds[0]} ... ${itemIds[itemIds.length - 1]} (${itemIds.length} columns)`;
}

function uniqueStrings(items) {
  return [...new Set(items
    .filter((item) => typeof item === "string" && item.trim())
    .map((item) => item.trim()))];
}

function range(min, max) {
  return Array.from({ length: max - min + 1 }, (_, index) => min + index);
}

function deepFreeze(value) {
  if (Array.isArray(value)) {
    value.forEach(deepFreeze);
  } else if (value && typeof value === "object") {
    Object.values(value).forEach(deepFreeze);
  }
  return Object.freeze(value);
}
