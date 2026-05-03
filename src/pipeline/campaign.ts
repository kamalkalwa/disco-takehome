import type { Plan, CampaignConfig } from "../lib/schemas";
import { getPublisher, getPersona } from "../lib/catalog";
import type { Publisher, Persona } from "../lib/types";

const DAILY_BUDGET_BASE_USD = 500;
const DAILY_BUDGET_PER_PUBLISHER_USD = 250;
const FLIGHT_DAYS = 30;
const MIN_PCT_PER_PUBLISHER = 0.05;
const MAX_PCT_PER_PUBLISHER = 0.4;

export function assembleCampaign(plan: Plan): CampaignConfig {
  const recPubs = plan.recommended_publishers.map((r) => ({
    fit_score: r.fit_score,
    publisher: getPublisher(r.publisher_id)!,
  }));
  const personas = plan.selected_personas.map((p) => getPersona(p.persona_id)!);

  const dailyBudget = DAILY_BUDGET_BASE_USD + DAILY_BUDGET_PER_PUBLISHER_USD * recPubs.length;
  const allocations = allocateBudget(recPubs, dailyBudget);
  const targeting = deriveTargeting(recPubs.map((x) => x.publisher), personas);
  const bid = deriveBidStrategy(recPubs.map((x) => x.publisher));
  const expectedAov = average(recPubs.map((x) => x.publisher.avg_order_value_usd));

  return {
    objective: chooseObjective(expectedAov),
    targeting,
    budget: {
      daily_usd: dailyBudget,
      flight_days: FLIGHT_DAYS,
      allocations,
    },
    bid_strategy: bid,
    measurement: {
      primary_kpi: bid.pricing_model === "CPM" ? "reach" : bid.pricing_model === "CPC" ? "CTR" : "CPA",
      expected_aov_usd: round(expectedAov),
    },
  };
}

function allocateBudget(
  entries: Array<{ fit_score: number; publisher: Publisher }>,
  dailyBudget: number
): CampaignConfig["budget"]["allocations"] {
  // Weight = fit_score × log10(monthly_impressions). Score gives us "how good is the match";
  // log-impressions gives us "can this publisher absorb spend". Log keeps mega-publishers from
  // monopolizing the budget while still rewarding scale.
  const weights = entries.map((e) => e.fit_score * Math.log10(e.publisher.monthly_impressions));
  const sum = weights.reduce((a, b) => a + b, 0);
  let pcts = weights.map((w) => w / sum);
  pcts = clampAndRenormalize(pcts, MIN_PCT_PER_PUBLISHER, MAX_PCT_PER_PUBLISHER);

  return entries.map((e, i) => {
    const pct = pcts[i];
    return {
      publisher_id: e.publisher.id,
      publisher_name: e.publisher.name,
      pct: round(pct, 4),
      daily_usd: round(pct * dailyBudget),
      rationale:
        `Fit ${e.fit_score}/100 × scale (${formatImpressions(e.publisher.monthly_impressions)}/mo). ` +
        `AOV $${e.publisher.avg_order_value_usd}.`,
    };
  });
}

function clampAndRenormalize(pcts: number[], min: number, max: number): number[] {
  // One pass of clamp + renormalize. Good enough for n <= 8.
  const clamped = pcts.map((p) => Math.min(Math.max(p, min), max));
  const total = clamped.reduce((a, b) => a + b, 0);
  return clamped.map((p) => p / total);
}

function deriveTargeting(publishers: Publisher[], personas: Persona[]): CampaignConfig["targeting"] {
  const ages = publishers.map((p) => parseAgeRange(p.audience.age_skew));
  const minAge = Math.min(...ages.map((a) => a.min));
  const maxAge = Math.max(...ages.map((a) => a.max));
  const femaleShare = average(publishers.map((p) => p.audience.gender_split.female));
  const genderSkew: "female" | "male" | "balanced" =
    femaleShare > 0.65 ? "female" : femaleShare < 0.35 ? "male" : "balanced";

  const geos = unique(publishers.flatMap((p) => p.audience.top_geos));
  const incomeTiers = unique(publishers.map((p) => p.audience.income_tier));
  const interestTags = unique([
    ...publishers.flatMap((p) => [p.category, ...p.subcategories]),
    ...personas.flatMap((p) => p.category_affinities),
  ]);

  return {
    age_range: `${minAge}-${maxAge}`,
    gender_skew: genderSkew,
    geos,
    income_tiers: incomeTiers,
    interest_tags: interestTags.slice(0, 20),
  };
}

function deriveBidStrategy(publishers: Publisher[]): CampaignConfig["bid_strategy"] {
  const aov = average(publishers.map((p) => p.avg_order_value_usd));
  // Pricing model is chosen by AOV band:
  // - High AOV (>$100): CPA — purchase intent matters more than impressions.
  // - Mid AOV ($30-100): CPC — drive clicks, optimize landing pages.
  // - Low AOV (<$30): CPM — high-frequency impulse, brand recall plays better than per-click bids.
  if (aov > 100) {
    return {
      pricing_model: "CPA",
      bid_range_usd: { min: round(aov * 0.15), max: round(aov * 0.35) },
      pacing: "even",
      rationale: `High AOV ($${round(aov)}) supports CPA bidding at 15-35% of AOV; even pacing protects budget across the flight.`,
    };
  }
  if (aov >= 30) {
    return {
      pricing_model: "CPC",
      bid_range_usd: { min: 0.5, max: 1.5 },
      pacing: "even",
      rationale: `Mid AOV ($${round(aov)}) — CPC keeps cost predictable while landing-page quality drives conversion.`,
    };
  }
  return {
    pricing_model: "CPM",
    bid_range_usd: { min: 5, max: 15 },
    pacing: "accelerated",
    rationale: `Low AOV ($${round(aov)}) — CPM with accelerated pacing maximizes early reach for impulse-driven categories.`,
  };
}

function chooseObjective(aov: number): CampaignConfig["objective"] {
  if (aov > 120) return "conversion";
  if (aov >= 50) return "consideration";
  return "awareness";
}

function parseAgeRange(s: string): { min: number; max: number } {
  const m = s.match(/(\d+)\s*-\s*(\d+)/);
  if (!m) return { min: 25, max: 54 };
  return { min: Number(m[1]), max: Number(m[2]) };
}

function average(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}
function unique<T>(xs: T[]): T[] {
  return [...new Set(xs)];
}
function round(n: number, digits = 2): number {
  const f = Math.pow(10, digits);
  return Math.round(n * f) / f;
}
function formatImpressions(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}
