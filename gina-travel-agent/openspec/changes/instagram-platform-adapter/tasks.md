## 1. Setup

- [x] 1.1 Add `express` (or reuse Node's built-in `http`) as a dependency for `webhook-server.js` and verify `npm install` succeeds
- [x] 1.2 Add `INSTAGRAM_PAGE_ACCESS_TOKEN`, `INSTAGRAM_APP_SECRET`, `INSTAGRAM_VERIFY_TOKEN` to `.env.example` and verify the file lists all three with empty values

## 2. Webhook verification and signature checking

- [x] 2.1 Implement the `GET /webhook/instagram` verification handler in `webhook-server.js` and verify it echoes `hub.challenge` only when `hub.verify_token` matches `INSTAGRAM_VERIFY_TOKEN`, via a curl test with correct and incorrect tokens
- [x] 2.2 Implement signature verification in `platforms/instagram.js` (HMAC over the raw request body using `INSTAGRAM_APP_SECRET`) and verify a request with a tampered/missing signature is rejected before reaching the core pipeline, via a unit test with a known-good and known-bad signature

## 3. Payload parsing and core pipeline integration

- [x] 3.1 Implement a parser in `platforms/instagram.js` that converts Meta's documented webhook message payload into `{ customerId, userMessage }`, using `platform = 'instagram'` and the payload's sender id as `platform_user_id`, and verify it against at least one sample payload from Meta's documentation (unit test)
- [x] 3.2 Wire `webhook-server.js`'s POST handler to call the existing `extractMessage` -> `applyExtractedMemory` -> `generateReply` pipeline (same functions `cli.js` already uses) for a parsed message, and verify by POSTing a sample payload to a locally running server and observing the same extraction/memory/reply behavior already covered by the message-extraction, customer-memory, and persona-reply specs

## 4. Reply delivery

- [x] 4.1 Implement the Send API call in `platforms/instagram.js` (POST to the documented send-message endpoint with the reply text and recipient id) and verify the request shape against Meta's documentation
- [x] 4.2 Implement dry-run mode: when `INSTAGRAM_PAGE_ACCESS_TOKEN` is unset, log the outgoing reply payload instead of calling the real Send API, and verify by running the local server without the token set and confirming no network call is attempted (console log only)

## 5. End-to-end verification

- [x] 5.1 Start `webhook-server.js` locally without real Instagram credentials, POST a sample webhook payload via curl, and verify the full path (parse -> extract -> memory -> reply -> dry-run send log) completes and prints a sensible reply
- [x] 5.2 Document in `README.md` how to run `webhook-server.js` locally and what still requires a real, App-Review-approved Instagram professional account + Facebook Page before it can serve real traffic

---

### 검증 기록

- 2.1: `GET /webhook/instagram`에 올바른 토큰 → `hub.challenge` 그대로 반환(200), 틀린 토큰 → 403. curl로 확인.
- 2.2: 단위 테스트로 유효/변조/누락 서명 케이스 확인 (Meta 문서의 `X-Hub-Signature-256` = `sha256=` + HMAC-SHA256(raw body, app secret) 형식 그대로 구현).
- 3.1: Meta 문서의 샘플 payload(`object`/`entry`/`messaging`/`sender.id`/`message.text`)로 단위 테스트 - 정상 파싱, `object != 'instagram'`, postback-only(텍스트 없음) 케이스 모두 확인.
- 3.2: 서명된 payload를 실행 중인 서버에 curl POST → 실제로 `extractMessage`(mock, intent=travel_planning/destination=Bangkok/travel_date=March 정확히 추출) → `applyExtractedMemory`(DB에 `platform='instagram'`으로 저장 확인) → `generateReply`(mock, 라벨 붙은 응답)까지 전부 로그로 확인.
- 4.1/4.2: `INSTAGRAM_PAGE_ACCESS_TOKEN` 없이 실행 → 실제 Send API 호출 없이 `[DRY-RUN ...]` 로그로 정확한 recipient/message가 남는 것 확인. 실제 토큰으로의 전송은 Instagram 계정/App Review가 없어 아직 미확인 - Meta 문서의 요청 형태(`POST /{IG_ID}/messages`, `recipient.id`, `message.text`)만 코드로 반영.
- **구현 중 발견한 tasks.md에 없던 사항**: Send API 엔드포인트에 페이지 액세스 토큰 외에 `INSTAGRAM_IG_ID`(발신 계정의 Instagram ID)도 필요해서 `.env.example`에 추가함. 동작 자체는 변경 없음(원래도 "Send API로 보낸다"였음), 필요한 설정값이 하나 늘었을 뿐.
