import { structuredCall } from "../lib/llm";
import { PlanSchema, type Plan } from "../lib/schemas";
import { PLAN_SYSTEM_INSTRUCTIONS, planUserMessage } from "../../prompts/plan";
import { PUBLISHER_IDS, PERSONA_IDS } from "../lib/catalog";

export async function runPlan(brief: string): Promise<Plan> {
  const plan = await structuredCall({
    schema: PlanSchema,
    system: PLAN_SYSTEM_INSTRUCTIONS,
    userText: planUserMessage(brief),
    maxTokens: 4096,
    temperature: 0.4,
  });

  for (const r of plan.recommended_publishers) {
    if (!PUBLISHER_IDS.includes(r.publisher_id)) {
      throw new Error(`Plan referenced unknown publisher_id: ${r.publisher_id}`);
    }
  }
  for (const e of plan.excluded_publishers) {
    if (!PUBLISHER_IDS.includes(e.publisher_id)) {
      throw new Error(`Plan referenced unknown excluded publisher_id: ${e.publisher_id}`);
    }
  }
  for (const p of plan.selected_personas) {
    if (!PERSONA_IDS.includes(p.persona_id)) {
      throw new Error(`Plan referenced unknown persona_id: ${p.persona_id}`);
    }
  }

  return plan;
}
