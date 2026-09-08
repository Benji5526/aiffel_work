## Context

See `proposal.md` for why this backfill exists. The MVP already runs as three cooperating pieces behind a single CLI test channel (`cli.js`): message extraction, customer memory, and persona-driven reply generation, plus a rule-based mock fallback for when no LLM credential is configured. This design records the architecture those three specs assume, so later changes (platform adapters, a media library) build on a stated shape instead of re-deriving it from the code.

## Goals / Non-Goals

**Goals:**
- Explain why extraction, memory, and reply are separate stages instead of one monolithic call.
- Record why memory merges additively instead of overwriting.
- Record why a mock mode exists and how it's selected.

**Non-Goals:**
- Introducing any new capability or changing existing behavior (see proposal.md - this is documentation only).
- Specifying the eventual platform adapter (Instagram/X/Threads) design - out of scope until that change is proposed.

## Decisions

**Three-stage pipeline (extract -> memory -> reply), not one combined call.**
Extraction (intent + travel details) is a structured-output task; memory merge is pure data logic with no LLM involvement; reply generation is free-form text generation, optionally using tools. Mixing structured extraction and free-form generation in a single call degrades output quality, and mixing DB logic into the LLM-calling layer makes the memory rules impossible to unit-test without an API key. Keeping them separate lets each stage be tested independently (as `message-extraction`, `customer-memory`, `persona-reply` specs).

**Single extraction call covers both intent and travel-detail extraction.**
Alternative considered: separate `classifyIntent` and `extractMemory` calls. Rejected because free-tier LLM rate limits (as low as single-digit requests per minute) are exhausted within 2-3 conversation turns when every turn costs 3 calls instead of 2. Both concerns are "structured extraction from the same message," so one schema covering both fields is a natural merge with no quality loss.

**Additive-only memory merge (existing value wins).**
A field, once known, is never cleared or overwritten by a later message that doesn't repeat it. Alternative considered: always take the latest extraction. Rejected because customers don't repeat earlier details in every message ("the two of you" implies people=2 from three turns ago) - overwriting with null on every turn where the field isn't restated would erase memory constantly.

**Environment-variable-gated automatic mock mode.**
Every function that would call the LLM checks the credential env var first and falls back to a local, rule-based implementation with no code path switch (no `--mock` flag). Alternative considered: a separate mock build/config. Rejected because it would require remembering to toggle it, and the goal is that logic can always be exercised - with or without a key - using the exact same entry points.

## Risks / Trade-offs

- **[Risk]** The mock fallback's rule-based extraction (regex/keyword matching) is far less accurate than the real LLM and can misclassify or miss details entirely. **Mitigation**: mock mode is documented and explicitly labeled in its own responses (`[MOCK - ...]`); it is a flow-verification tool, not a quality stand-in, and is never the code path used when a credential is present.
- **[Risk]** Combining intent and memory extraction into one schema makes that schema harder to extend independently later (e.g., adding a new intent might require touching the same call as adding a new memory field). **Mitigation**: acceptable trade-off while the free tier's rate limit is the binding constraint; revisit if/when a higher-throughput tier removes that constraint.
- **[Risk]** Free-tier rate limits are external and can change (observed both a per-minute limit and a stricter daily cap during testing). **Mitigation**: not addressed by this change; a future change could add request queuing/backoff if needed.
