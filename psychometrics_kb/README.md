# Psychometrics KB

이 폴더는 앱이 "학습"하는 원천 문서입니다.

원칙:

- PDF 원문을 대량 복사하지 않습니다.
- 주제별 Markdown 문서로 쪼갭니다.
- 영어 키워드와 한국어 키워드를 함께 넣습니다.
- `## Summary`, `## Checks`, `## Use When` 구조를 유지합니다.
- 수정 후 `npm run kb:build`를 실행해 `knowledge/generated-kb.js`를 갱신합니다.

빌드 흐름:

```text
psychometrics_kb/**/*.md
  -> npm run kb:build
  -> knowledge/generated-kb.js
  -> src/knowledge-base.js retrieval
```
