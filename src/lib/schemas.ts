import { z } from "zod";

export const PlanSchema = z.object({
  brief_understanding: z.object({
    normalized: z.string().describe("A clean 1-2 sentence restatement of what the advertiser sells and to whom."),
    confidence: z.enum(["high", "medium", "low"]).describe("How confident you are in your interpretation given the input."),
    notes: z
      .string()
      .describe("If confidence is medium or low: explain what is unclear or what you assumed. Empty string if high confidence."),
  }),
  recommended_publishers: z
    .array(
      z.object({
        publisher_id: z.string().describe("Must be one of the catalog publisher IDs (e.g. pub_007)."),
        fit_score: z
          .number()
          .min(0)
          .max(100)
          .describe("0-100 fit score; reserve >85 for very strong fits."),
        reasoning: z
          .string()
          .describe(
            "1-3 sentences. Reference specific publisher attributes (notes, AOV, demographics, subcategories) and why they match the advertiser."
          ),
      })
    )
    .min(1)
    .max(8)
    .describe("Top publishers ordered best-first. 3-8 entries; fewer is fine if the catalog has poor fit."),
  excluded_publishers: z
    .array(
      z.object({
        publisher_id: z.string(),
        reason: z
          .string()
          .describe("1-2 sentences on why this publisher was considered but excluded. Be specific."),
      })
    )
    .min(1)
    .max(5)
    .describe(
      "3-5 publishers that look adjacent or tempting but don't fit. Prefer instructive contrasts over obvious mismatches."
    ),
  selected_personas: z
    .array(
      z.object({
        persona_id: z.string().describe("Must be one of the catalog persona IDs (e.g. persona_004)."),
        why_chosen: z
          .string()
          .describe(
            "1-2 sentences referencing the persona's category_affinities, messaging_preferences, or disinterested_in."
          ),
      })
    )
    .min(3)
    .max(5)
    .describe("3-5 personas selected from the catalog who are plausible buyers."),
});

export type Plan = z.infer<typeof PlanSchema>;

export const CreativeSchema = z.object({
  headline: z.string().describe("8 words or fewer. Attention-getting, specific, no clichés."),
  body: z.string().describe("Up to 30 words. Clear value prop, persona-aware angle, no false claims."),
  angle: z
    .string()
    .describe("1 sentence explaining the creative choice — which persona signal you targeted."),
});

export type Creative = z.infer<typeof CreativeSchema>;

export const CampaignConfigSchema = z.object({
  objective: z.enum(["awareness", "consideration", "conversion"]),
  targeting: z.object({
    age_range: z.string(),
    gender_skew: z.enum(["female", "male", "balanced"]),
    geos: z.array(z.string()),
    income_tiers: z.array(z.string()),
    interest_tags: z.array(z.string()),
  }),
  budget: z.object({
    daily_usd: z.number(),
    flight_days: z.number(),
    allocations: z.array(
      z.object({
        publisher_id: z.string(),
        publisher_name: z.string(),
        pct: z.number(),
        daily_usd: z.number(),
        rationale: z.string(),
      })
    ),
  }),
  bid_strategy: z.object({
    pricing_model: z.enum(["CPM", "CPC", "CPA"]),
    bid_range_usd: z.object({ min: z.number(), max: z.number() }),
    pacing: z.enum(["even", "accelerated"]),
    rationale: z.string(),
  }),
  measurement: z.object({
    primary_kpi: z.enum(["CTR", "CPA", "ROAS", "reach"]),
    expected_aov_usd: z.number(),
  }),
});

export type CampaignConfig = z.infer<typeof CampaignConfigSchema>;

export const DraftCampaignSchema = z.object({
  brief: z.object({
    raw: z.string(),
    normalized: z.string(),
    confidence: z.enum(["high", "medium", "low"]),
    notes: z.string(),
  }),
  publishers: z.object({
    recommended: z.array(
      z.object({
        publisher_id: z.string(),
        publisher_name: z.string(),
        fit_score: z.number(),
        reasoning: z.string(),
      })
    ),
    excluded: z.array(
      z.object({
        publisher_id: z.string(),
        publisher_name: z.string(),
        reason: z.string(),
      })
    ),
  }),
  personas: z.array(
    z.object({
      persona_id: z.string(),
      persona_name: z.string(),
      why_chosen: z.string(),
    })
  ),
  creatives: z.array(
    z.object({
      persona_id: z.string(),
      persona_name: z.string(),
      headline: z.string(),
      body: z.string(),
      angle: z.string(),
    })
  ),
  campaign: CampaignConfigSchema,
  meta: z.object({
    duration_ms: z.number(),
  }),
});

export type DraftCampaign = z.infer<typeof DraftCampaignSchema>;
