# Gina Travel Agent (MVP)

AI 여행 상담원 Gina. 코어(의도 분석+고객 메모리+페르소나+답변 생성)는 세 가지 채널로 쓸 수 있다: 터미널 CLI(테스트/개발용), 웹 채팅(이름만으로 여러 사람이 접속), Instagram DM(실제 채널, 웹훅 기반).

## 포함된 것

- **의도 분석 + 고객 메모리 추출 (Extract Agent)** — 의도(`travel_planning`/`tour_price`/`hotel_recommendation`/`itinerary_question`/`media_request`/`general_inquiry`)와 여행지/날짜/인원/관심사/예산을 한 번의 호출로 함께 추출 (무료 API 요청 한도를 아끼기 위해 턴당 2회 호출로 통합: 추출 1 + 답변생성 1)
- **고객 메모리 (Customer Memory)** — 추출된 정보를 SQLite에 누적 저장 (기존 값은 덮어쓰지 않음)
- **페르소나 (Persona)** — [persona-gina-travel.md](persona-gina-travel.md)의 전문 여행 상담원 톤
- **답변 생성 (Reply Agent)** — 페르소나 + 고객 메모리 + 대화 이력을 반영해 응답 생성
- **Instagram DM 연동 (Webhook Adapter)** — Meta 웹훅으로 실제 DM을 받아 위 파이프라인을 그대로 태우고 Send API로 답장 (자세한 내용은 아래 "Instagram 연동" 참고)

## 아직 없는 것

X/Threads 연동(Threads는 공식 DM API 자체가 없음 — `openspec/changes/instagram-platform-adapter/proposal.md` 참고), 관리자 승인 화면, 예약/결제, 미디어(사진/영상) 검색·전송 — 전부 다음 단계.

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

## 웹 채팅

여러 사람이 브라우저로 접속해서 Gina와 대화할 수 있는 간단한 채팅 화면. 로그인은 없고 **이름만 입력받아 구분**한다 (같은 이름을 쓰면 같은 대화로 취급됨 — MVP 한계). 지금은 **내 컴퓨터/네트워크에서만** 접근 가능(공개 배포는 다루지 않음).

```
node web-server.js
```

기본 포트 3001 (`WEB_PORT` 환경변수로 변경 가능). `http://localhost:3001` 접속 → 이름 입력 → 대화 시작. `cli.js`/`webhook-server.js`와 똑같은 서비스 계층을 재사용하며, 고객은 `platform='web'`으로 저장된다.

## Instagram 연동

Meta의 [Instagram Messaging API](https://developers.facebook.com/docs/messenger-platform/instagram)를 웹훅으로 받아 Gina 코어에 그대로 태운다. `webhook-server.js` + `platforms/instagram.js`.

### 로컬 실행 (App Review 없이도 가능한 부분)

```
cp .env.example .env
# .env에 INSTAGRAM_VERIFY_TOKEN, INSTAGRAM_APP_SECRET는 직접 정하는 값(테스트용으로 아무 문자열이나 가능)
# INSTAGRAM_PAGE_ACCESS_TOKEN, INSTAGRAM_IG_ID는 아직 없어도 됨 (없으면 dry-run 모드로 실제 전송 없이 로그만 남김)
node webhook-server.js
```

- `GET /webhook/instagram` — Meta가 웹훅 등록 시 보내는 검증 요청. `hub.verify_token`이 `.env`의 `INSTAGRAM_VERIFY_TOKEN`과 일치해야 `hub.challenge`를 돌려준다.
- `POST /webhook/instagram` — 실제 메시지 수신. `X-Hub-Signature-256` 헤더를 `INSTAGRAM_APP_SECRET`으로 검증한 뒤에만 처리한다.
- `INSTAGRAM_PAGE_ACCESS_TOKEN`이 없으면(App Review 전 등) 실제 Send API를 호출하지 않고 `[DRY-RUN ...]` 로그로 전송될 내용만 남긴다 — 키만 넣으면 코드 수정 없이 실제 전송으로 전환된다 (Gemini 키와 같은 패턴).

### 실제 서비스에 붙이려면 (이 코드베이스 밖의 준비물)

1. Instagram **프로페셔널 계정** + 그 계정에 연결된 **Facebook 페이지**
2. Facebook Login이 설정된 **Meta 앱**, 페이지 액세스 토큰에 `instagram_manage_messages` 권한 — 프로덕션 사용은 Meta의 **App Review** 승인 필요
3. 계정의 메시지 컨트롤에서 "connected tools" 토글 켜기
4. 위 값들을 `.env`(`INSTAGRAM_PAGE_ACCESS_TOKEN`, `INSTAGRAM_APP_SECRET`, `INSTAGRAM_VERIFY_TOKEN`, `INSTAGRAM_IG_ID`)에 채우고, 외부에서 접근 가능한 HTTPS 주소로 `webhook-server.js`를 배포해 Meta 웹훅 설정에 등록

X/Threads는 다루지 않는다 — 근거는 `openspec/changes/instagram-platform-adapter/proposal.md` 참고.

## 구조

- `db.js` — SQLite 연결 및 `customers`/`messages` 테이블 생성
- `persona-gina-travel.md` — Gina의 페르소나 설계 문서
- `services/llmClient.js` — Gemini API 호출 래퍼 (텍스트 생성 / 구조화 출력)
- `services/extractAgent.js` — 의도 분류 + 메모리 추출 (구조화 출력 1회 호출)
- `services/memoryService.js` — 고객 프로필 조회/저장 (DB 병합, LLM 호출 없음)
- `services/replyAgent.js` — 페르소나 기반 응답 생성
- `services/mock.js` — API 키 없을 때 쓰는 규칙 기반 가짜 구현
- `cli.js` — 터미널 채팅 진입점 (테스트/개발용)
- `web-server.js` + `public/` — 여러 사람이 접속하는 웹 채팅 화면 (이름만으로 구분, 로컬 전용)
- `webhook-server.js` — Instagram 웹훅 HTTP 서버 (실제 채널 진입점)
- `platforms/instagram.js` — 웹훅 검증/파싱, Send API 호출
