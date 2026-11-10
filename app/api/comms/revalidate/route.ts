import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/comms";

// Called by the portal after a save, so the website shows the change straight away instead of within a minute.
export async function POST(request: Request) {
  if (!(await requireAdmin(request))) return NextResponse.json({ error: "Not allowed." }, { status: 401 });
  revalidatePath("/", "layout");
  return NextResponse.json({ ok: true });
}
