## 1. Setup

- [ ] 1.1 Add `express` (or reuse Node's built-in `http`) as a dependency for `webhook-server.js` and verify `npm install` succeeds
- [ ] 1.2 Add `INSTAGRAM_PAGE_ACCESS_TOKEN`, `INSTAGRAM_APP_SECRET`, `INSTAGRAM_VERIFY_TOKEN` to `.env.example` and verify the file lists all three with empty values

## 2. Webhook verification and signature checking

- [ ] 2.1 Implement the `GET /webhook/instagram` verification handler in `webhook-server.js` and verify it echoes `hub.challenge` only when `hub.verify_token` matches `INSTAGRAM_VERIFY_TOKEN`, via a curl test with correct and incorrect tokens
- [ ] 2.2 Implement signature verification in `platforms/instagram.js` (HMAC over the raw request body using `INSTAGRAM_APP_SECRET`) and verify a request with a tampered/missing signature is rejected before reaching the core pipeline, via a unit test with a known-good and known-bad signature

## 3. Payload parsing and core pipeline integration

- [ ] 3.1 Implement a parser in `platforms/instagram.js` that converts Meta's documented webhook message payload into `{ customerId, userMessage }`, using `platform = 'instagram'` and the payload's sender id as `platform_user_id`, and verify it against at least one sample payload from Meta's documentation (unit test)
- [ ] 3.2 Wire `webhook-server.js`'s POST handler to call the existing `extractMessage` -> `applyExtractedMemory` -> `generateReply` pipeline (same functions `cli.js` already uses) for a parsed message, and verify by POSTing a sample payload to a locally running server and observing the same extraction/memory/reply behavior already covered by the message-extraction, customer-memory, and persona-reply specs

## 4. Reply delivery

- [ ] 4.1 Implement the Send API call in `platforms/instagram.js` (POST to the documented send-message endpoint with the reply text and recipient id) and verify the request shape against Meta's documentation
- [ ] 4.2 Implement dry-run mode: when `INSTAGRAM_PAGE_ACCESS_TOKEN` is unset, log the outgoing reply payload instead of calling the real Send API, and verify by running the local server without the token set and confirming no network call is attempted (console log only)

## 5. End-to-end verification

- [ ] 5.1 Start `webhook-server.js` locally without real Instagram credentials, POST a sample webhook payload via curl, and verify the full path (parse -> extract -> memory -> reply -> dry-run send log) completes and prints a sensible reply
- [ ] 5.2 Document in `README.md` how to run `webhook-server.js` locally and what still requires a real, App-Review-approved Instagram professional account + Facebook Page before it can serve real traffic
