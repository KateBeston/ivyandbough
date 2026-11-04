import { NextResponse } from "next/server";
import { requireAdmin, sendCampaign } from "@/lib/comms";

export const maxDuration = 300;

export async function POST(request: Request) {
  if (!(await requireAdmin(request))) return NextResponse.json({ error: "Not allowed." }, { status: 401 });
  const body = (await request.json().catch(() => null)) as { templateId?: string } | null;
  if (!body?.templateId) return NextResponse.json({ error: "Choose a template." }, { status: 400 });
  const result = await sendCampaign(body.templateId);
  return NextResponse.json(result, { status: "error" in result ? 422 : 200 });
}
