## 1. Verify message-extraction spec against the existing implementation

- [x] 1.1 Confirm `services/extractAgent.js` classifies a sample message per intent (travel_planning/tour_price/hotel_recommendation/itinerary_question/media_request/general_inquiry) and verify by running `node cli.js chat <name>` with one representative message per intent and reading the printed `[intent: ...]` line
- [x] 1.2 Confirm unmentioned fields come back null by sending a message with no travel details and checking the extraction result contains no destination/product/travel_date/people/interest/budget
- [x] 1.3 Confirm a single message triggers exactly one extraction call by checking `extractAgent.js` makes one `generateStructured` call per `extractMessage` invocation (code inspection - no separate intent + memory calls)
- [x] 1.4 Confirm the mock fallback in `services/mock.js` activates and returns a result with no API call by running `GEMINI_API_KEY= node cli.js chat <name>` and checking the reply is labeled `[MOCK ...]`

## 2. Verify customer-memory spec against the existing implementation

- [x] 2.1 Confirm additive merge (existing value wins) by running two turns as separate processes for the same customer where the second turn's extraction would return null for an already-known field, and verifying the stored value is unchanged in `gina.db`
- [x] 2.2 Confirm cross-session persistence by running `node cli.js chat <name>` in two separate process invocations for the same customer name and verifying the second run's reply reflects information from the first run
- [x] 2.3 Confirm a new customer record is created with unset fields on first contact by querying `customers` in a fresh `gina.db` after one message from a new customer id
- [x] 2.4 Confirm messages are logged in chronological order by inspecting `getRecentMessages` output against the `messages` table `id` order

## 3. Verify persona-reply spec against the existing implementation

- [x] 3.1 Confirm replies reference known customer context by sending a follow-up message after customer details are known and checking the reply naturally reflects them (real API required for this check)
- [x] 3.2 Confirm price questions defer to a human consultant rather than inventing a price, per `persona-gina-travel.md` guardrails - verify with a real API call asking for a tour price
- [ ] 3.3 Confirm booking/payment requests are declined with a human hand-off offered
- [ ] 3.4 Confirm honest AI disclosure when directly asked
- [x] 3.5 Confirm the mock fallback in `services/replyAgent.js` returns a clearly labeled reply with no API call when `GEMINI_API_KEY` is unset

## 4. Close out

- [x] 4.1 Record in this change (or a follow-up note) which of the above were verified via mock mode only vs. a real API call, since 3.1-3.4 need a live credential to confirm end-to-end
- [ ] 4.2 Run `openspec archive gina-travel-agent-mvp` once verification is complete, so the specs move to `openspec/specs/` as the project's baseline

---

### 검증 기록

**목 모드로 확인** (1.1, 1.2, 1.4, 2.1, 2.2, 2.3, 2.4): `GEMINI_API_KEY=` 강제 오버라이드 + 별도 프로세스 재실행으로 확인. 6개 의도 분류 전부 정확, null 규칙 정확, 새 고객 필드 unset 확인, 메시지 시간순 저장 확인, 추가식 병합(Osaka/April이 2턴째에도 유지) 및 세션 간 지속 확인.

**실제 Gemini API로 확인** (3.1, 3.2): 오늘 이전 세션에서 "Phuket, 12월, 동반 2인" 대화로 실제 확인함 — 2턴째 "the price for the island tour?" 질문에 대해 실제 응답이 "I don't have the live pricing right now, but a human consultant can confirm the exact rates and options **for the two of you**"로 답해, 알고 있는 인원 정보(3.1)를 자연스럽게 반영하면서 동시에 가격을 지어내지 않고 사람에게 넘기는 가드레일(3.2)이 한 응답에서 함께 확인됐다.

**미확인** (3.3, 3.4): 무료 티어 일일 할당량 소진으로 이번 세션에서는 실제 API로 예약 거절/AI 정직 고지 시나리오를 아직 확인하지 못함. 할당량 회복 후 재확인 필요.

**보류**: 4.2(아카이브)는 3.3/3.4가 남아있어 아직 진행하지 않음.
