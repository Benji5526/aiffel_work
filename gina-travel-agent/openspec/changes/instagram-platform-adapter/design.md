## Context

See `proposal.md` for why Instagram specifically, and platform-research findings on Instagram/X/Threads API availability (recorded there). The existing core (message-extraction, customer-memory, persona-reply, all already specified) is channel-agnostic by design - `cli.js` already proves that by driving it from a terminal loop. This design adds a second, push-based channel: Meta delivers messages via webhook instead of a human typing.

## Goals / Non-Goals

**Goals:**
- Reuse the existing core pipeline unmodified - the adapter only translates in and out.
- Fit the existing `customers` schema (`platform`/`platform_user_id`) with no migration.
- Make as much of this verifiable without a real, App-Review-approved Instagram account as possible.

**Non-Goals:**
- X or Threads adapters (separate future changes; Threads currently has no official DM API at all).
- Sending images/videos (no media library yet).
- Completing Meta's App Review / business verification (external process, not code).
- An admin approval UI before sending (out of scope for this change; today the reply sends automatically, same as the CLI channel).

## Decisions

**A new `webhook-server.js`, separate from `cli.js`.**
`cli.js` is a pull-based loop (a human types, we wait). Instagram delivers messages by Meta POSTing to a webhook URL we control - a fundamentally different entry point (long-running HTTP server vs. an interactive readline loop). Keeping them as two separate entry points that both call the same `services/*` functions avoids forcing one shape onto the other.

**Platform-specific logic lives in `platforms/instagram.js`, not in `webhook-server.js` or the core services.**
`webhook-server.js` handles routing (the two HTTP routes) and delegates payload verification/parsing and Send API calls to `platforms/instagram.js`. This mirrors the adapter separation already stated in the MVP's design.md ("Gina Core" vs. per-platform adapters) - alternative platforms plug in the same way later without touching the core.

**Reuse `platform`/`platform_user_id` as-is; no new tables.**
The `customers` table was already designed with a platform column specifically for this. Instagram's sender id (IGSID) slots in as `platform_user_id` with `platform = 'instagram'` - zero schema change.

**Dry-run mode when no real credentials are configured.**
Alternative considered: require real Instagram credentials to test anything. Rejected because the real account + App Review approval is an external, possibly slow process, and the core pipeline underneath is already fully testable. Instead, `platforms/instagram.js`'s send step logs the outgoing payload instead of calling the real Send API when `INSTAGRAM_PAGE_ACCESS_TOKEN` is unset - mirroring the existing `GEMINI_API_KEY`-gated mock pattern already used elsewhere in this project (see `free-tier-llm-app` skill's mock-mode guidance for the same shape of decision).

## Risks / Trade-offs

- **[Risk]** Instagram's webhook payload shape and Send API contract are taken from Meta's public documentation, not from a live, verified account (App Review not yet obtained). Actual production traffic could reveal payload shapes not covered here. **Mitigation**: build the parser against Meta's documented sample payloads and unit-test against those; treat first real traffic as an additional verification step once credentials exist, not as done.
- **[Risk]** No signature verification means anyone could POST fake "messages" to the webhook endpoint. **Mitigation**: signature verification against the app secret is a hard requirement in the spec (not optional), rejecting unverified requests before they reach the core pipeline.
- **[Risk]** Running a public-facing webhook server has different operational needs (uptime, HTTPS endpoint, exposure) than the CLI ever did. **Mitigation**: out of scope for this change to solve deployment/hosting; tasks.md will note it as a prerequisite for real traffic, not something this change implements.
