# Gina Travel Agent (MVP)

AI 여행 상담원 Gina의 코어 MVP. 실제 DM 채널(Instagram/X/Threads) 연동 전, 터미널 CLI로 대화를 시뮬레이션하며 핵심 로직을 검증하는 단계.

## 포함된 것 (이번 MVP)

- **의도 분석 + 고객 메모리 추출 (Extract Agent)** — 의도(`travel_planning`/`tour_price`/`hotel_recommendation`/`itinerary_question`/`media_request`/`general_inquiry`)와 여행지/날짜/인원/관심사/예산을 한 번의 호출로 함께 추출 (무료 API 요청 한도를 아끼기 위해 턴당 2회 호출로 통합: 추출 1 + 답변생성 1)
- **고객 메모리 (Customer Memory)** — 추출된 정보를 SQLite에 누적 저장 (기존 값은 덮어쓰지 않음)
- **페르소나 (Persona)** — [persona-gina-travel.md](persona-gina-travel.md)의 전문 여행 상담원 톤
- **답변 생성 (Reply Agent)** — 페르소나 + 고객 메모리 + 대화 이력을 반영해 응답 생성

## 아직 없는 것

Instagram/X/Threads 연동, 관리자 승인 화면, 예약/결제, 미디어(사진/영상) 검색·전송 — 전부 다음 단계.

## 실행 방법

```
npm install
cp .env.example .env   # .env에 GEMINI_API_KEY 입력 (무료 발급: https://aistudio.google.com/apikey)
node cli.js chat <고객이름>
```

`.env`에 키가 없으면 자동으로 목(mock) 모드로 동작한다 — 규칙 기반 가짜 응답으로 흐름만 검증하며, 실제 LLM 호출은 하지 않는다.

대화 도중 `exit`을 입력하면 종료. 같은 고객이름으로 다시 실행하면 이전 대화 기억이 이어진다 (`gina.db`에 저장됨).

## LLM

[Google Gemini API](https://ai.google.dev) (`gemini-3.8-flash`, `@google/genai` SDK)를 사용한다. 무료 티어로 시작 가능.

## 구조

- `db.js` — SQLite 연결 및 `customers`/`messages` 테이블 생성
- `persona-gina-travel.md` — Gina의 페르소나 설계 문서
- `services/llmClient.js` — Gemini API 호출 래퍼 (텍스트 생성 / 구조화 출력)
- `services/extractAgent.js` — 의도 분류 + 메모리 추출 (구조화 출력 1회 호출)
- `services/memoryService.js` — 고객 프로필 조회/저장 (DB 병합, LLM 호출 없음)
- `services/replyAgent.js` — 페르소나 기반 응답 생성
- `services/mock.js` — API 키 없을 때 쓰는 규칙 기반 가짜 구현
- `cli.js` — 터미널 채팅 진입점 (실제 DM 채널의 임시 대역)
