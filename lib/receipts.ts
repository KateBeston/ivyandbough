import { buildInvoice, type InvoiceData } from "./invoice";
import { admin } from "./server";

type Db = NonNullable<ReturnType<typeof admin>>;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ivy-and-bough.vercel.app";

async function asset(file: string) {
  const res = await fetch(`${SITE_URL}/invoice/${file}`);
  if (!res.ok) throw new Error(`${file} returned ${res.status}`);
  return new Uint8Array(await res.arrayBuffer());
}

export const buildPdf = (data: InvoiceData) => buildInvoice(data, asset);

// One stored PDF and one record per order, so a resend always matches the original.
export async function ensureReceipt(db: Db, orderId: string, data: InvoiceData, opts: { regenerate?: boolean } = {}) {
  const path = `receipts/${data.number}.pdf`;
  const { data: existing } = await db.from("order_receipts").select("file_path").eq("order_id", orderId).maybeSingle();
  if (existing && !opts.regenerate) {
    const { data: file, error } = await db.storage.from("documents").download(existing.file_path);
    if (error) throw error;
    return { path: existing.file_path as string, bytes: new Uint8Array(await file.arrayBuffer()) };
  }
  const bytes = await buildPdf(data);
  const { error: upload } = await db.storage.from("documents").upload(path, bytes, { contentType: "application/pdf", upsert: true });
  if (upload) throw upload;
  const { error } = await db.from("order_receipts").upsert({ order_id: orderId, receipt_number: data.number, file_path: path, transaction_id: data.transaction || null, total: data.total, generated_at: new Date().toISOString() }, { onConflict: "order_id" });
  if (error) throw error;
  return { path, bytes };
}
