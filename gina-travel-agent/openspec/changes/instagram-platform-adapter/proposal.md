## Why

The MVP's core (message-extraction, customer-memory, persona-reply) is complete and verified, but Gina only runs behind a manual CLI test channel. To be useful in production, customer DMs need to arrive through a real messaging platform. Platform API research (done as part of this proposal) shows Instagram has a mature official Messaging API today, while X's DM access model just changed (Feb 2026) and needs more verification, and Threads has no public DM API at all as of 2026. Instagram is the one platform where a real integration can be built now.

## What Changes

- Add a webhook-based entry point (`webhook-server.js`) that receives Instagram DM webhooks from Meta and sends replies back via Instagram's Send API, using the existing extract → memory → reply pipeline unchanged.
- Add `platforms/instagram.js`: webhook signature verification, payload parsing into the existing `{customerId, userMessage}` shape, and the outbound Send API call.
- Reuse the existing `customers` table's `platform`/`platform_user_id` columns for Instagram-scoped sender IDs - no schema change.
- Out of scope for this change: X and Threads adapters (Threads has no official API at all; X needs further verification of its new pay-per-use DM terms), image/video replies (no media library yet), and Meta's own App Review / business verification process (an external, non-code step).

## Capabilities

### New Capabilities
- `instagram-platform-adapter`: Receives Instagram DM webhooks, verifies them, converts them into the existing customer-message shape, runs them through the existing core pipeline, and sends Gina's text reply back to the customer via Instagram's Send API.

### Modified Capabilities

(none - message-extraction, customer-memory, and persona-reply are consumed as-is, unchanged)

## Impact

- New files: `webhook-server.js`, `platforms/instagram.js`.
- New environment variables: `INSTAGRAM_PAGE_ACCESS_TOKEN`, `INSTAGRAM_APP_SECRET`, `INSTAGRAM_VERIFY_TOKEN` (added to `.env.example`).
- No changes to `db.js`, `services/extractAgent.js`, `services/memoryService.js`, `services/replyAgent.js`, or the `cli.js` test channel - both channels will call the same service layer.
- Depends on a real Instagram professional account, linked Facebook Page, and a Meta App with `instagram_manage_messages` permission (App Review required for production use) - these are prerequisites the user must set up outside this codebase before the adapter can be used against real traffic.
