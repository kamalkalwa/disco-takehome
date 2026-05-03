import { structuredCall } from "../lib/llm";
import { CreativeSchema, type Creative } from "../lib/schemas";
import { CREATIVE_SYSTEM_INSTRUCTIONS, creativeUserMessage } from "../../prompts/creative";
import { getPersona } from "../lib/catalog";

export type CreativeForPersona = Creative & {
  persona_id: string;
  persona_name: string;
};

export async function runCreatives(brief: string, personaIds: string[]): Promise<CreativeForPersona[]> {
  const personas = personaIds.map((id) => {
    const p = getPersona(id);
    if (!p) throw new Error(`Unknown persona_id: ${id}`);
    return p;
  });

  // Fan out: one LLM call per persona, in parallel. Latency = single-call latency, not N×.
  const results = await Promise.all(
    personas.map(async (persona) => {
      const creative = await structuredCall({
        schema: CreativeSchema,
        system: CREATIVE_SYSTEM_INSTRUCTIONS,
        userText: creativeUserMessage(brief, persona),
        maxTokens: 1024,
        temperature: 0.8,
      });
      return { ...creative, persona_id: persona.id, persona_name: persona.name };
    })
  );

  return results;
}
