# Psychometrician Copilot

심리측정 연구자를 위한 분석 설계 보조 웹앱입니다.

사용자가 연구 조건을 입력하면 CFA, IRT, DIF, 측정동일성, 신뢰도, 타당도 근거를 어떤 순서로 확인해야 하는지 구조화된 리포트로 보여줍니다. 데모 척도 채점 화면도 함께 제공해, AI가 점수를 임의로 계산하지 않고 결정론적 엔진 결과만 설명하도록 설계했습니다.

## Live Demo

GitHub Pages 배포 후 아래 주소에서 확인할 수 있습니다.

```text
https://cloudvelvet.github.io/psychometrician-copilot/
```

## What It Shows

- 연구 조건 기반 심리측정 분석 상담
- EFA, CFA, IRT, DIF, 측정동일성 추천 로드맵
- 누락된 설계 정보와 비판자 경고
- lavaan, mirt, psych, semTools용 R 코드 템플릿
- 데모 척도 채점 및 하위요인 점수 리포트
- CSV/TSV/TXT/XLSX 업로드 기반 코호트 요약 리포트
- 문항 컬럼, 역채점, 요인, 집단 변수 매핑
- 결측률, 범위 밖 응답, 하위척도 평균/합계, Cronbach alpha 요약
- Dataset Readiness Agent: 데이터 정리 필요 여부, 막히는 조건, 다음 3단계, 분석별 적합도 힌트
- 응답 품질 경고: 누락, long-string, 극단 응답, 주의문항, 일관성 쌍

## Why This Exists

일반 LLM은 심리측정 질문에 대해 단순한 기준을 기계적으로 말하기 쉽습니다.

예를 들면:

- `alpha > .70이면 신뢰도가 좋다`
- `CFI > .90이면 모형이 적합하다`
- `5점 Likert 문항에도 일단 CFA를 하면 된다`

이 앱은 그런 단순 답변 대신, 분석 전에 확인해야 할 조건을 먼저 드러냅니다.

- 연구 목적
- 구성개념 정의
- 문항 수와 응답척도
- 표본 수
- 예상 요인 구조
- 결측과 범주 분포
- 집단 비교와 공정성 검토 필요 여부
- 점수 사용 목적과 해석 경계

## How To Teach It

이 앱은 현재 모델을 직접 fine-tuning하지 않습니다. 대신 전문가 지식을 작은 카드로 쌓아두고, 입력된 연구 조건과 추천 분석에 맞는 카드를 결정론적으로 검색합니다.

지식 추가 위치:

```text
psychometrics_kb/
knowledge/topics.js
knowledge/standards-2014.js
```

권장 방식은 `psychometrics_kb/`에 주제별 Markdown 문서를 추가하는 것입니다. 이 문서들은 빌드 단계에서 브라우저용 지식 카드로 변환됩니다.

새 지식 카드는 아래 필드를 갖습니다.

```js
{
  id: "missing_data",
  title: "Missing data needs a stated handling plan",
  relatedAnalyses: ["data_screening", "ordinal_cfa"],
  keywords: ["missing", "결측", "fiml"],
  summary: "짧은 전문가 요약",
  checks: ["리포트에 보여줄 점검 항목"],
  useWhen: ["이 지식을 꺼내야 하는 조건"]
}
```

수정 후 확인:

```powershell
npm run kb:build
npm test
npm run build
```

GitHub Pages에 반영하려면 변경사항을 `main` 브랜치에 push하면 됩니다.

현재 `standards_2014edition.pdf`는 원문을 복제하지 않고, AERA/APA/NCME 2014 Standards의 장별 핵심을 짧은 지식 카드로 재작성해 넣었습니다. 앱 화면에서는 해당 카드에 출처가 함께 표시됩니다.

`구조방정식모형의 기본과 확장.pdf`는 이미지 기반 PDF라 원문 텍스트 추출 대신 표지와 목차를 확인한 뒤, SEM 상담에 필요한 주제별 요약 카드로 재작성했습니다.

## Screens

### 분석 상담

연구 조건을 입력하면 분석 로드맵, 근거 토픽, 코드 템플릿, 경고를 한 화면에서 확인할 수 있습니다.

### 척도 채점

데모 척도에 응답하면 하위요인 점수, 전체 평균, 응답 품질 상태를 확인할 수 있습니다.

### 데이터 업로드

CSV, TSV, TXT, XLSX 첫 시트 파일을 브라우저 안에서 읽습니다. 파일은 서버로 전송하지 않습니다.

업로드 후 문항 컬럼을 선택하고, 역채점 여부와 요인명을 지정한 뒤 `데이터 리포트 보기`를 누르면 오른쪽에 코호트 요약이 표시됩니다.

현재 계산되는 항목:

- 응답자 수와 선택 문항 수
- 결측률과 범위 밖 응답 수
- 전체 Cronbach alpha
- 하위척도별 점수와 alpha
- 집단 변수별 N과 평균
- 결측이 많은 문항
- 분석 준비 상태: `Ready`, `Needs cleanup`, `Not ready`
- 다음에 처리할 3단계와 CFA/IRT/DIF/집단 비교 전제 힌트

XLSX는 일반적인 `.xlsx` 첫 시트를 대상으로 하며, 오래된 `.xls`, 암호가 걸린 파일, 복잡한 수식/서식은 CSV로 저장한 뒤 올리는 것을 권장합니다.

## Local Preview

```powershell
npm run web
```

브라우저에서 엽니다.

```text
http://localhost:4173
```

## Deploy

이 저장소는 GitHub Pages 배포용 workflow를 포함합니다.

1. GitHub repository의 `Settings -> Pages`로 이동
2. `Source`를 `GitHub Actions`로 선택
3. `Actions` 탭에서 `Deploy GitHub Pages` workflow 실행 확인

수동 빌드:

```powershell
npm run build
```

빌드 결과는 `public/`에 생성됩니다.

## Important Boundary

이 앱은 진단 도구가 아닙니다.

포함된 척도 문항은 프로토타입용 데모입니다. 실제 연구, 상담, 임상, 채용, 평가 장면에 사용하려면 검증되거나 라이선스가 확보된 척도, 대상 집단에 대한 신뢰도와 타당도 근거, 개인정보 보호 절차, 전문가 검토가 필요합니다.

## Tech

- Static HTML, CSS, JavaScript
- No backend
- No database
- No third-party runtime dependency
- GitHub Pages ready
