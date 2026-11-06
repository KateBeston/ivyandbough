import { NextResponse } from "next/server";
import { allowed } from "@/lib/limits";
import { admin } from "@/lib/server";
import { findRequest } from "@/lib/signing";

export async function GET(request: Request) {
  if (!(await allowed(request, "sign-pdf", 30, 600))) return NextResponse.json({ error: "Please try again in a few minutes." }, { status: 429 });
  const token = new URL(request.url).searchParams.get("t") ?? "";
  const r = await findRequest(token);
  const db = admin();
  if (!db || !r?.pdf_path) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const { data } = await db.storage.from("documents").download(r.pdf_path);
  if (!data) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return new NextResponse(data, { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="Ivy-and-Bough-${r.legal_versions.version_id}-signed.pdf"`, "Cache-Control": "private, no-store" } });
}
