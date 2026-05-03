import { runPlan } from "./plan";
import { runCreatives } from "./creative";
import { assembleCampaign } from "./campaign";
import { getPublisher } from "../lib/catalog";
import type { DraftCampaign } from "../lib/schemas";

export async function draftCampaign(brief: string): Promise<DraftCampaign> {
  const t0 = Date.now();

  const plan = await runPlan(brief);
  const creatives = await runCreatives(
    brief,
    plan.selected_personas.map((p) => p.persona_id)
  );
  const campaign = assembleCampaign(plan);

  return {
    brief: {
      raw: brief,
      normalized: plan.brief_understanding.normalized,
      confidence: plan.brief_understanding.confidence,
      notes: plan.brief_understanding.notes,
    },
    publishers: {
      recommended: plan.recommended_publishers.map((r) => ({
        publisher_id: r.publisher_id,
        publisher_name: getPublisher(r.publisher_id)!.name,
        fit_score: r.fit_score,
        reasoning: r.reasoning,
      })),
      excluded: plan.excluded_publishers.map((e) => ({
        publisher_id: e.publisher_id,
        publisher_name: getPublisher(e.publisher_id)!.name,
        reason: e.reason,
      })),
    },
    personas: plan.selected_personas.map((p) => ({
      persona_id: p.persona_id,
      persona_name: creatives.find((c) => c.persona_id === p.persona_id)!.persona_name,
      why_chosen: p.why_chosen,
    })),
    creatives: creatives.map((c) => ({
      persona_id: c.persona_id,
      persona_name: c.persona_name,
      headline: c.headline,
      body: c.body,
      angle: c.angle,
    })),
    campaign,
    meta: { duration_ms: Date.now() - t0 },
  };
}
