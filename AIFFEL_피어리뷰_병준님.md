# PRT(Peer Review Template)

[x] **1. 주어진 문제를 해결하는 완성된 코드가 제출되었나요?**

- `오늘의운세`는 Express API, 양력·음력 변환, 사주 계산, 별자리·띠·오늘의 운세, 프론트엔드 결과 화면까지 구현되어 있습니다.
  - [server.js](<C:/my vault/ME/1. Note/Hermes/Aiffel_Work/병준님/aiffel_work/오늘의운세/back/server.js:13>)
  - [fortune.js](<C:/my vault/ME/1. Note/Hermes/Aiffel_Work/병준님/aiffel_work/오늘의운세/back/fortune.js:138>)
  - [saju.js](<C:/my vault/ME/1. Note/Hermes/Aiffel_Work/병준님/aiffel_work/오늘의운세/back/saju.js:106>)

- `ToDoApp`은 할 일 추가·조회·완료·삭제, 태그·검색·마감일 필터 기능이 구현되어 있습니다.
- `ToDoApp_cli`은 MCP 서버와 CLI 양쪽에서 동일한 `todoService`를 공유하도록 구현되어 있습니다.

- 다만 `ai-companion-chat`은 실행 코드 없이 PRD와 페르소나 문서만 있으며, 문서상으로도 구현 단계가 “다음 단계”로 남아 있습니다.
  - [PRD.md](<C:/my vault/ME/1. Note/Hermes/Aiffel_Work/병준님/aiffel_work/ai-companion-chat/PRD.md:53>)

[x] **2. 핵심적이거나 복잡하고 이해하기 어려운 부분에 설명이 작성되어 있나요?**

- 사주 계산 모듈에 JSDoc과 계산 과정 주석이 잘 작성되어 있습니다.
  - 진태양시 보정 공식: [saju.js](<C:/my vault/ME/1. Note/Hermes/Aiffel_Work/병준님/aiffel_work/오늘의운세/back/saju.js:75>)
  - 십성 분류 원리: [saju.js](<C:/my vault/ME/1. Note/Hermes/Aiffel_Work/병준님/aiffel_work/오늘의운세/back/saju.js:37>)

- 운세 결과를 동일한 날짜에 재현하기 위한 해시·시드 난수 방식도 주석으로 설명되어 있습니다.
  - [fortune.js](<C:/my vault/ME/1. Note/Hermes/Aiffel_Work/병준님/aiffel_work/오늘의운세/back/fortune.js:56>)

- API 입력·응답 구조와 계산 제한사항을 [API.md](<C:/my vault/ME/1. Note/Hermes/Aiffel_Work/병준님/aiffel_work/오늘의운세/API.md:39>)에 상세히 정리했습니다.

- `ToDoApp_cli`의 [HANDOFF.md](<C:/my vault/ME/1. Note/Hermes/Aiffel_Work/병준님/aiffel_work/ToDoApp_cli/HANDOFF.md:1>)에는 구조 변경 이유와 MCP stdio 문제 해결 과정이 잘 기록되어 있습니다.

[ ] **3. 에러를 디버깅한 기록 또는 새로운 시도·추가 실험이 있나요?**

- `ToDoApp_cli/HANDOFF.md`에는 `dotenv`의 stdout 로그로 MCP 통신이 깨질 수 있었던 문제와 해결 과정이 구체적으로 기록되어 있습니다.
- MCP JSON-RPC 통신, CLI 성공·실패 케이스, 회귀 테스트를 수행한 기록도 있습니다.
- 다만 `오늘의운세`와 `ToDoApp`에는 별도의 디버깅 로그나 실험 결과 문서가 부족합니다.
- 자동화 테스트 파일은 없고, 두 Todo 프로젝트의 `npm test`도 현재 기본 실패 스크립트입니다.
- 정적 검토에서는 JavaScript 14개 파일의 문법 검사를 통과했고, 별자리 경계값 24건과 운세 결정성 테스트도 통과했습니다. 다만 의존성(`node_modules`)이 없어 실제 서버 실행까지는 확인하지 못했습니다.

[ ] **4. 회고를 잘 작성했나요?**

- README와 API 문서는 기능, 기술 스택, 계산 로직, 제한사항을 잘 설명하고 있습니다.
- 하지만 프로젝트를 통해 배운 점, 어려웠던 점, 아쉬웠던 점을 정리한 개인 회고는 확인되지 않았습니다.
- 딥러닝 프로젝트는 아니지만, 전체 흐름을 다음과 같이 간단한 도식으로 추가하면 이해에 도움이 됩니다.

```text
사용자 입력
   ↓
프론트엔드 JSON 요청
   ↓
Express API
   ↓
양력·음력 변환 / 진태양시 보정
   ↓
사주·별자리·띠·운세 계산
   ↓
JSON 응답
   ↓
프론트엔드 결과 렌더링
```

[x] **5. 코드가 간결하고 효율적인가요?**

- `ToDoApp_cli`은 MCP와 CLI가 `services/todoService.js`를 공유해 중복을 줄였습니다.
  - [todoService.js](<C:/my vault/ME/1. Note/Hermes/Aiffel_Work/병준님/aiffel_work/ToDoApp_cli/services/todoService.js:39>)
- SQL 쿼리에 파라미터 바인딩을 사용해 기본적인 SQL Injection 위험을 줄였습니다.
- 프론트엔드에서는 `textContent`를 사용해 사용자 입력을 HTML로 직접 삽입하지 않습니다.
- JavaScript 프로젝트이므로 PEP8은 직접 적용 대상이 아니며, 별도의 ESLint 설정은 없습니다. 일부 파일에는 긴 한 줄 코드가 있어 포맷터나 린터를 도입하면 가독성이 더 좋아질 것 같습니다.

# 참고 링크 및 코드 개선

## 1. 코드 리뷰 시 참고한 링크

- [Express 공식 문서](https://expressjs.com/) — Node.js 웹 서버 및 API 라우팅
- [lunar-javascript](https://github.com/6tail/lunar-javascript) — 음양력·간지·사주 계산
- [Cloudflare Tunnel 공식 문서](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/) — 외부 접속 구성
- [포스텔러 만세력](https://pro.forceteller.com/) — UI 참고 자료

## 2. 코드 리뷰를 통해 개선을 제안할 코드

### 날짜의 “오늘” 기준 통일

현재 Todo 앱은 브라우저와 SQLite에서 UTC 기준 날짜를 사용합니다.

- [app.js](<C:/my vault/ME/1. Note/Hermes/Aiffel_Work/병준님/aiffel_work/ToDoApp/public/app.js:42>)
- [todos.js](<C:/my vault/ME/1. Note/Hermes/Aiffel_Work/병준님/aiffel_work/ToDoApp/routes/todos.js:58>)
- [todoService.js](<C:/my vault/ME/1. Note/Hermes/Aiffel_Work/병준님/aiffel_work/ToDoApp_cli/services/todoService.js:53>)

한국 시간 기준 서비스라면 다음처럼 통일하는 것이 좋습니다.

```js
// SQLite
todos.due_date = date('now', '+9 hours')

// 오늘 완료 목록
date(updated_at, '+9 hours') = date('now', '+9 hours')
```

브라우저의 `toISOString()`도 KST 기준 날짜 함수로 교체하면 자정 전후 날짜 불일치가 방지됩니다.

### 입력값 검증 강화

`PATCH` 요청에서 `title: null` 또는 빈 문자열이 들어오면 오류가 발생하거나 빈 제목이 저장될 수 있습니다.

```js
if (title !== undefined) {
  if (typeof title !== 'string' || !title.trim()) {
    throw new Error('title은 비어 있을 수 없습니다.');
  }
}
```

마감일도 `YYYY-MM-DD` 형식인지 서버와 MCP 양쪽에서 검증하면 좋습니다.

# 총평

실행 가능한 세 프로젝트는 기능 구현과 구조화가 잘 되어 있으며, 특히 `오늘의운세`의 사주 계산 설명과 `ToDoApp_cli`의 문제 해결 기록이 인상적입니다. 다만 전체 디렉터리에 미완성 프로젝트가 함께 있고, 자동화 테스트와 회고 문서가 부족합니다. 날짜 기준 통일, 입력값 검증, 테스트 코드 추가까지 보완하면 완성도와 재현성이 크게 향상될 것 같습니다.
