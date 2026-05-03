# Disco Take-Home — Campaign Drafter

An advertiser types one sentence; the system returns ranked publishers (with reasoning + exclusions), 3-5 persona-tuned ad creatives, and a structured campaign config. Original brief: [ASSIGNMENT.md](ASSIGNMENT.md). Glossary: [GLOSSARY.md](GLOSSARY.md).

## Run it

```bash
cp .env.example .env.local       # add your GEMINI_API_KEY
npm install
npm run dev                      # http://localhost:3000
```

A draft takes ~7-10s end-to-end (Gemini 2.5 Flash). The page has 5 example briefs — clear, ambiguous, off-catalog B2B, adversarial — to demonstrate behavior on hard inputs.

## How it works

Two LLM phases plus pure TS, behind one POST `/api/draft-campaign`:

1. **Plan** ([src/pipeline/plan.ts](src/pipeline/plan.ts)) — one Gemini call with `responseJsonSchema` (strict structured output). Receives the full publisher + persona catalogs plus the brief. Returns ranked publishers with reasoning, 3-5 explicit exclusions with reasons, and 3-5 selected personas with `why_chosen`. Catalog IDs are re-validated against the catalog after parse — the model cannot hallucinate publishers.
2. **Creatives** ([src/pipeline/creative.ts](src/pipeline/creative.ts)) — fan-out, one Gemini call per selected persona, in parallel via `Promise.all`. Each call gets the full persona record and is told to lean on `messaging_preferences` and avoid `disinterested_in`.
3. **Campaign assembly** ([src/pipeline/campaign.ts](src/pipeline/campaign.ts)) — pure TS, no LLM. Computes budget allocation, targeting, bid strategy, expected AOV.

Every prompt the system uses lives in [prompts/](prompts/). Schemas are in [src/lib/schemas.ts](src/lib/schemas.ts) — one source of truth for both the LLM contract and the TypeScript types.

## Campaign config shape — and why

Five sections, mirrors what real DSPs (DV360, TTD, Meta Ads) actually need: `objective`, `targeting`, `budget` (daily + flight + per-publisher allocations), `bid_strategy` (model + bid range + pacing + rationale), `measurement`. Budget allocation weight is `fit_score × log10(monthly_impressions)`, clamped 5-40% per publisher — fit signals match quality, log-impressions caps mega-publishers without ignoring scale. Bid model is chosen by AOV band (CPM <$30, CPC $30-100, CPA >$100). It's the smallest field set that's actually launchable.

## What's hard vs. easy

**Easy:** plumbing, the good-fit cases (any sensible prompt nails dog food → Pawline), picking the config shape.

**Hard:** (a) Ambiguous and off-catalog inputs — examples #5 ("we help people feel better"), #7 (B2B dental SaaS), #15 ("idk just try it") will produce confident garbage from a naive system. The plan schema includes a `confidence` field and the prompt explicitly tells the model to use it; the UI surfaces it. (b) **Informative** exclusions — anyone can list 5 random non-fits; picking publishers that look adjacent but aren't is the harder skill. (c) Persona-faithful creatives, not generic ad copy — the parallel fan-out gives each persona its own call so the model doesn't average across personas.

The interesting engineering lives at the prompt + schema seam: schema is a contract the model can't violate, prompt is intent against that contract, pure-TS assembler turns intent into something a real ad system could ingest.

## What I cut and why

- **Eval harness, streaming UI, hybrid deterministic+LLM ranker, persistence, image creatives, provider abstraction** — none required by the brief. Single-session, single-provider, single-page demo.
- **Prompt caching** — Gemini's context-cache 32K-token minimum is above our ~6K-token catalog, so it's a no-op at this scale.

## What I'd build next (with another week)

1. **Eval harness** — ~10 golden briefs with assertions (e.g. "persona_004 must appear", "exclusion must mention AOV mismatch"); run on every commit. Highest-leverage thing.
2. **Streaming** — send plan → creatives → campaign as they complete. Cuts perceived latency.
3. **Feedback loop** — thumbs on each section, stored to a DB; reuse as eval ground truth.
4. **Catalog as a service** — [src/lib/catalog.ts](src/lib/catalog.ts) is already the seam.
5. **Cost & latency dashboard** — promote per-stage `console.log` to structured logs → OTel.
6. **Bandit on creatives** once impression + click data exists.

## Notes

- Model defaults to `gemini-2.5-flash`. Override with `GEMINI_MODEL` (e.g. `gemini-2.5-pro`).
- Temperature: 0.4 for planning, 0.8 for creative.
- Gemini 2.5's "thinking" tokens count against `maxOutputTokens` and would truncate JSON output mid-string; explicitly disabled in [src/lib/llm.ts](src/lib/llm.ts).
