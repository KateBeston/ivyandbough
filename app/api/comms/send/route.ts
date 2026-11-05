import { NextResponse } from "next/server";
import { requireAdmin, sendMessage, type Draft } from "@/lib/comms";

export async function POST(request: Request) {
  if (!(await requireAdmin(request))) return NextResponse.json({ error: "Not allowed." }, { status: 401 });
  const body = (await request.json().catch(() => null)) as { slug?: string; draft?: Draft; to?: string; orderId?: string; isTest?: boolean; details?: string } | null;
  if (!body) return NextResponse.json({ error: "Nothing to send." }, { status: 400 });
  const signOff = "\n\nKind regards,\nIvy & Bough Customer Care";
  const draft = body.draft ? { ...body.draft, message_class: "Transactional" as const, body: body.draft.channel === "Email" ? `${body.draft.body.trimEnd()}${signOff}` : body.draft.body } : undefined;
  const result = await sendMessage({ slug: body.slug, draft, to: body.to, orderId: body.orderId, isTest: body.isTest, data: body.details?.trim() ? { details: body.details.trim().slice(0, 1000) } : undefined });
  return NextResponse.json(result, { status: result.ok ? 200 : 422 });
}
