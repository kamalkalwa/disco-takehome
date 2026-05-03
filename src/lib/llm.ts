import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY;
if (!apiKey) {
  console.warn("[llm] GEMINI_API_KEY is not set — calls will fail at request time.");
}

export const client = new GoogleGenAI({ apiKey: apiKey ?? "" });

export const MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";

export type StructuredCallArgs<S extends z.ZodTypeAny> = {
  schema: S;
  system: string;
  userText: string;
  maxTokens?: number;
  temperature?: number;
};

export async function structuredCall<S extends z.ZodTypeAny>(args: StructuredCallArgs<S>): Promise<z.infer<S>> {
  const jsonSchema = zodToJsonSchema(args.schema, { target: "openApi3" }) as Record<string, unknown>;
  // Gemini's responseJsonSchema is strict about extra top-level keys; drop the meta-schema marker.
  delete jsonSchema.$schema;

  const response = await client.models.generateContent({
    model: MODEL,
    contents: [{ role: "user", parts: [{ text: args.userText }] }],
    config: {
      systemInstruction: args.system,
      temperature: args.temperature ?? 0.5,
      maxOutputTokens: args.maxTokens ?? 4096,
      responseMimeType: "application/json",
      responseJsonSchema: jsonSchema,
      // Gemini 2.5 charges thinking tokens against maxOutputTokens. For structured-output
      // tasks like ours, thinking adds latency and cost without measurable quality gain,
      // and risks truncating the JSON before it completes. Disable explicitly.
      thinkingConfig: { thinkingBudget: 0 },
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error("Gemini returned an empty response.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    throw new Error(`Gemini returned non-JSON output: ${(err as Error).message}\n${text.slice(0, 500)}`);
  }

  return args.schema.parse(parsed);
}
