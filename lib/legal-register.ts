import { createHash } from "crypto";
import { SITE_URL } from "./comms";
import { admin } from "./server";
import { supabase } from "./supabase";

const entities: Record<string, string> = { "&amp;": "&", "&#x27;": "'", "&quot;": '"', "&lt;": "<", "&gt;": ">", "&nbsp;": " " };

function pageText(html: string) {
  const main = html.match(/<main[\s\S]*?<\/main>/)?.[0] ?? "";
  return main.replace(/<p class="[^"]*legal-version[^"]*">[\s\S]*?<\/p>/, "").replace(/<(script|style)[\s\S]*?<\/\1>/g, "").replace(/<\/(p|h\d|li|tr)>/g, "\n").replace(/<[^>]+>/g, " ").replace(/&[#a-z0-9]+;/gi, (e) => entities[e] ?? e).replace(/[ \t]+/g, " ").replace(/\n\s*/g, "\n").trim();
}

// Any change to a site legal page becomes a new published version, and the old one is kept.
export async function snapshotLegalPages() {
  const db = admin();
  if (!db) throw new Error("SUPABASE_SECRET_KEY is not set.");
  const { data: docs } = await db.from("legal_documents").select("id,code,source_path").eq("audience", "Customer");
  const added: string[] = [];
  for (const doc of docs ?? []) {
    const res = await fetch(`${SITE_URL}${doc.source_path}`, { cache: "no-store" });
    if (!res.ok) continue;
    const body = pageText(await res.text());
    if (!body) continue;
    const hash = createHash("sha256").update(body).digest("hex");
    const { data: latest } = await db.from("legal_versions").select("content_hash").eq("document_id", doc.id).eq("status", "Published").maybeSingle();
    if (latest?.content_hash === hash) continue;
    const { data: row, error } = await db.from("legal_versions").insert({ document_id: doc.id, body }).select("id,version_id").single();
    if (error) throw new Error(error.message);
    const { error: e } = await db.rpc("publish_legal_version", { target: row.id });
    if (e) throw new Error(e.message);
    added.push(row.version_id);
  }
  return added;
}

export async function publishedVersionId(code: string) {
  const { data } = await supabase.from("legal_documents").select("legal_versions(version_id,status)").eq("code", code).maybeSingle();
  return (data?.legal_versions as { version_id: string; status: string }[] | undefined)?.find((v) => v.status === "Published")?.version_id ?? "";
}
