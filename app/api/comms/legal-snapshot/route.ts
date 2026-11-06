import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/comms";
import { snapshotLegalPages } from "@/lib/legal-register";

export const maxDuration = 60;

export async function POST(request: Request) {
  if (!(await requireAdmin(request))) return NextResponse.json({ error: "Not allowed." }, { status: 401 });
  try {
    return NextResponse.json({ added: await snapshotLegalPages() });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "The pages couldn't be checked." }, { status: 500 });
  }
}
