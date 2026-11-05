import { NextResponse } from "next/server";
import { requireAdmin, smsAudience } from "@/lib/comms";
import { admin } from "@/lib/server";

export async function GET(request: Request) {
  if (!(await requireAdmin(request))) return NextResponse.json({ error: "Not allowed." }, { status: 401 });
  const db = admin();
  if (!db) return NextResponse.json({ error: "SUPABASE_SECRET_KEY is not set." }, { status: 503 });
  return NextResponse.json({ count: (await smsAudience(db)).length });
}
