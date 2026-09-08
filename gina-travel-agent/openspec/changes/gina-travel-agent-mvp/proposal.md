## Why

`gina-travel-agent`(AI 여행 상담원 Gina의 코어 MVP)는 이미 구현·검증까지 끝난 상태이지만, 그 동작을 설명하는 스펙 문서가 없다. 다음 변경(플랫폼 연동, 미디어 라이브러리, 관리자 화면 등)을 안전하게 얹으려면, 지금 실제로 무엇을 보장하는지를 먼저 스펙으로 남겨야 한다. 이 change는 새 동작을 추가하지 않고, 이미 구현된 MVP의 동작을 사후에(backfill) 스펙으로 문서화한다.

## What Changes

- 코드 변경 없음. `openspec/specs/`에 현재 구현(`services/extractAgent.js`, `services/memoryService.js`, `services/replyAgent.js`, `services/mock.js`, `persona-gina-travel.md`, `cli.js`)이 실제로 만족하는 동작을 스펙으로 기록한다.
- 세 가지 능력(capability)으로 나눈다: 메시지 추출(의도+정보), 고객 메모리, 페르소나 응답(목 모드 폴백 포함).

## Capabilities

### New Capabilities

- `message-extraction`: 고객 DM 한 건에서 의도(6종)와 여행 관련 정보(목적지/상품/여행일/인원/관심사/예산)를 하나의 구조화 출력 호출로 함께 추출한다. 언급되지 않은 필드는 null이어야 하며 추측해서 채우지 않는다.
- `customer-memory`: 추출된 정보를 고객별로 SQLite에 누적 저장한다. 이미 값이 있는 필드는 새 메시지가 비웠다고 덮어쓰지 않으며(기존 값 우선), 별도 프로세스로 재실행해도 메모리가 이어진다.
- `persona-reply`: Gina 페르소나(전문 여행 상담원 톤)와 지금까지 알고 있는 고객 정보, 최근 대화 이력을 반영해 자유 형식 응답을 생성한다. 확인되지 않은 가격/재고/일정을 지어내지 않고, 예약·결제는 처리하지 않으며, AI 여부를 물으면 정직하게 답한다. API 키(`GEMINI_API_KEY`)가 없으면 규칙 기반 목 응답으로 자동 대체되어 실제 LLM 호출 없이도 흐름을 검증할 수 있다.

### Modified Capabilities

(없음 - 신규 스펙만 작성)

## Impact

- 영향받는 코드: 없음 (문서화 전용 change).
- 영향받는 파일(스펙 근거): `services/extractAgent.js`, `services/memoryService.js`, `services/replyAgent.js`, `services/mock.js`, `persona-gina-travel.md`, `cli.js`, `db.js`.
- 이후 change(플랫폼 연동, 미디어 라이브러리 등)는 이 스펙을 기준선으로 삼아 델타 스펙을 작성한다.
