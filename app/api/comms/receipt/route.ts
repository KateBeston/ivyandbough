import { NextResponse } from "next/server";
import { generateReceipt, requireAdmin } from "@/lib/comms";

export async function POST(request: Request) {
  if (!(await requireAdmin(request))) return NextResponse.json({ error: "Not allowed." }, { status: 401 });
  const body = (await request.json().catch(() => null)) as { orderId?: string; regenerate?: boolean } | null;
  if (!body?.orderId) return NextResponse.json({ error: "Choose an order." }, { status: 400 });
  try {
    return NextResponse.json({ path: await generateReceipt(body.orderId, body.regenerate) });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "The receipt could not be created." }, { status: 500 });
  }
}
