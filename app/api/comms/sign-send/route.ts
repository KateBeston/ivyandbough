import { NextResponse } from "next/server";
import { requireAdmin, sendMessage, SITE_URL } from "@/lib/comms";
import { admin } from "@/lib/server";
import { hashToken, newToken } from "@/lib/signing";

export async function POST(request: Request) {
  if (!(await requireAdmin(request))) return NextResponse.json({ error: "Not allowed." }, { status: 401 });
  const body = (await request.json().catch(() => null)) as { supplierId?: string; versionId?: string; name?: string; email?: string } | null;
  const db = admin();
  const email = String(body?.email ?? "").trim().toLowerCase();
  const name = String(body?.name ?? "").trim().slice(0, 120);
  if (!db || !body?.supplierId || !body.versionId || !name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return NextResponse.json({ error: "Add the signer's name and email, and choose a document." }, { status: 400 });
  const [{ data: supplier }, { data: version }] = await Promise.all([
    db.from("suppliers").select("name").eq("id", body.supplierId).maybeSingle(),
    db.from("legal_versions").select("id,version_id,status,legal_documents(title)").eq("id", body.versionId).maybeSingle(),
  ]);
  if (!supplier || !version) return NextResponse.json({ error: "That supplier or document wasn't found." }, { status: 404 });
  if (version.status !== "Published") return NextResponse.json({ error: "Only a published version can be sent for signature." }, { status: 422 });
  const token = newToken();
  const expires = new Date(Date.now() + 30 * 86400000);
  const { data: row, error } = await db.from("signature_requests").insert({ supplier_id: body.supplierId, version_id: version.id, signer_name: name, signer_email: email, token_hash: hashToken(token), expires_at: expires.toISOString() }).select("id,request_number").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const title = (version.legal_documents as unknown as { title: string }).title;
  const result = await sendMessage({ slug: "signature-request", to: email, data: { signer_name: name.split(" ")[0], document_title: title, supplier_name: supplier.name, sign_url: `${SITE_URL}/sign/${token}`, expires_on: new Intl.DateTimeFormat("en-AU", { dateStyle: "long", timeZone: "Australia/Brisbane" }).format(expires), version_id: version.version_id } });
  if (!result.ok) {
    await db.from("signature_requests").update({ status: "Cancelled" }).eq("id", row.id);
    return NextResponse.json({ error: result.error }, { status: 422 });
  }
  return NextResponse.json({ ok: true, reference: row.request_number });
}
