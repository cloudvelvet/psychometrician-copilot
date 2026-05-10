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

## Screens

### 분석 상담

연구 조건을 입력하면 분석 로드맵, 근거 토픽, 코드 템플릿, 경고를 한 화면에서 확인할 수 있습니다.

### 척도 채점

데모 척도에 응답하면 하위요인 점수, 전체 평균, 응답 품질 상태를 확인할 수 있습니다.

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
