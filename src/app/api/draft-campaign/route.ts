import { NextRequest, NextResponse } from "next/server";
import { draftCampaign } from "@/pipeline";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  let body: { brief?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const brief = typeof body.brief === "string" ? body.brief.trim() : "";
  if (!brief) {
    return NextResponse.json({ error: "Field `brief` is required and must be a non-empty string." }, { status: 400 });
  }
  if (brief.length > 2000) {
    return NextResponse.json({ error: "Brief must be 2000 characters or fewer." }, { status: 400 });
  }

  try {
    const draft = await draftCampaign(brief);
    return NextResponse.json(draft);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[draft-campaign] failed:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
