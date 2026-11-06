import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { sendMessage, SITE_URL } from "@/lib/comms";
import { allowed } from "@/lib/limits";
import { admin } from "@/lib/server";
import { buildSignedPdf, findRequest, whenBrisbane } from "@/lib/signing";

export const maxDuration = 60;
const text = (v: unknown, max = 160) => String(v ?? "").trim().slice(0, max);

export async function POST(request: Request) {
  if (!(await allowed(request, "sign", 20, 600))) return NextResponse.json({ error: "Please try again in a few minutes." }, { status: 429 });
  const body = await request.json().catch(() => null);
  const token = text(body?.token, 64);
  const name = text(body?.name);
  const position = text(body?.position);
  const company = text(body?.company);
  const abn = text(body?.abn, 20);
  if (!name || !position || !company || body?.consent !== true) return NextResponse.json({ error: "Please complete every field and tick the box." }, { status: 400 });
  const db = admin();
  const r = await findRequest(token);
  if (!db || !r) return NextResponse.json({ error: "This link isn't valid." }, { status: 404 });
  if (r.status === "Signed") return NextResponse.json({ error: "This document has already been signed." }, { status: 409 });
  if (r.status === "Cancelled" || new Date(r.expires_at) < new Date()) return NextResponse.json({ error: "This link has expired. Please contact Ivy & Bough for a new one." }, { status: 410 });
  const signedAt = new Date().toISOString();
  const ip = request.headers.get("x-vercel-forwarded-for")?.split(",")[0].trim() || request.headers.get("x-real-ip") || "";
  const agent = text(request.headers.get("user-agent"), 300);
  // Marked as signed first, so a double click can't sign twice.
  const { data: claimed } = await db.from("signature_requests").update({ status: "Signed", signed_at: signedAt, signed_name: name, signed_position: position, signed_company: company, signed_abn: abn, ip_address: ip, user_agent: agent, content_hash: r.legal_versions.content_hash }).eq("id", r.id).in("status", ["Sent", "Viewed"]).select("id");
  if (!claimed?.length) return NextResponse.json({ error: "This document has already been signed." }, { status: 409 });
  const signed = { ...r, signed_name: name, signed_position: position, signed_company: company, signed_abn: abn, ip_address: ip, user_agent: agent };
  const bytes = await buildSignedPdf(signed, signedAt);
  const path = `signed/${r.id}.pdf`;
  const { error: upload } = await db.storage.from("documents").upload(path, bytes, { contentType: "application/pdf", upsert: true });
  if (upload) { console.error("Signed copy could not be saved", r.id, upload.message); return NextResponse.json({ ok: true }); }
  await db.from("signature_requests").update({ pdf_path: path, pdf_hash: createHash("sha256").update(bytes).digest("hex") }).eq("id", r.id);
  await db.from("supplier_agreements").insert({ supplier_id: r.supplier_id, title: `${r.legal_versions.legal_documents.title} ${r.legal_versions.version_id}`, kind: "Supplier agreement", status: "Signed", starts_on: signedAt.slice(0, 10), file_path: path, notes: `Signed online by ${name}, reference ${r.request_number}.` });
  const data = { document_title: r.legal_versions.legal_documents.title, signer_name: name, signed_on: whenBrisbane(signedAt), pdf_url: `${SITE_URL}/api/sign/pdf?t=${token}`, version_id: r.legal_versions.version_id, request_number: r.request_number };
  await Promise.all([r.signer_email, "hello@ivyandbough.com"].map((to) => sendMessage({ slug: "signature-complete", to, data }).catch(() => null)));
  return NextResponse.json({ ok: true });
}
