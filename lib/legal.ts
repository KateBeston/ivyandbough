import { supabase } from "./supabase";

export const LEGAL_VERSION = "2026-11-06";
export const COMPANY = "Aurella Group Pty Ltd (ABN 70 649 742 423), trading as Ivy & Bough";
export const CONTACT_EMAIL = "hello@ivyandbough.com";

export type LegalVersion = { version_id: string; body: string; published_at: string };

// Legal documents are managed in the portal. The published version is what the site shows.
export async function publishedVersion(code: string) {
  const { data } = await supabase.from("legal_versions").select("version_id,body,published_at,legal_documents!inner(code)").eq("status", "Published").eq("legal_documents.code", code).maybeSingle();
  return data as unknown as LegalVersion | null;
}

export const publishedVersionId = async (code: string) => (await publishedVersion(code).catch(() => null))?.version_id || LEGAL_VERSION;
