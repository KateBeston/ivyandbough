import fontkit from "@pdf-lib/fontkit";
import { createHash, randomBytes } from "crypto";
import { PDFDocument, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { SITE_URL } from "./comms";
import { admin } from "./server";

const INK = rgb(0.184, 0.173, 0.153);
const BROWN = rgb(0.416, 0.38, 0.337);
const GOLD = rgb(0.769, 0.635, 0.396);
const WIDTH = 595.28;
const HEIGHT = 841.89;
const MARGIN = 54;

export const newToken = () => randomBytes(32).toString("hex");
export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export type SignRequest = {
  id: string; request_number: string; supplier_id: string; signer_name: string; signer_email: string; status: string; sent_at: string; viewed_at: string | null; signed_at: string | null; expires_at: string; signed_name: string; signed_position: string; signed_company: string; signed_abn: string; ip_address: string; user_agent: string; content_hash: string; pdf_path: string;
  suppliers: { name: string };
  legal_versions: { version_id: string; body: string; content_hash: string; legal_documents: { title: string } };
};

export async function findRequest(token: string) {
  const db = admin();
  if (!db || !/^[0-9a-f]{64}$/.test(token)) return null;
  const { data } = await db.from("signature_requests").select("*,suppliers(name),legal_versions(version_id,body,content_hash,legal_documents(title))").eq("token_hash", hashToken(token)).maybeSingle();
  return data as unknown as SignRequest | null;
}

export const whenBrisbane = (date: string) => `${new Intl.DateTimeFormat("en-AU", { dateStyle: "long", timeStyle: "medium", timeZone: "Australia/Brisbane" }).format(new Date(date))} AEST`;

// The fonts cover ordinary Latin text, so anything else in a signer's details is replaced rather than failing.
const safe = (text: string) => text.replace(/[^\x20-\x7E -ſ‘’“”–—]/g, "?");

function wrap(text: string, font: PDFFont, size: number, width: number) {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) <= width || !line) line = next;
    else { lines.push(line); line = word; }
  }
  if (line) lines.push(line);
  return lines;
}

export async function buildSignedPdf(r: SignRequest, signedAt: string) {
  const doc = r.legal_versions;
  const title = doc.legal_documents.title;
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  pdf.setTitle(`${title} ${doc.version_id} signed`);
  pdf.setAuthor("Ivy & Bough");
  const load = async (file: string) => new Uint8Array(await (await fetch(`${SITE_URL}/invoice/${file}`)).arrayBuffer());
  const [forumBytes, regularBytes, semiBytes] = await Promise.all(["forum.ttf", "montserrat-regular.ttf", "montserrat-semibold.ttf"].map(load));
  const forum = await pdf.embedFont(forumBytes, { subset: true });
  const regular = await pdf.embedFont(regularBytes, { subset: true });
  const semi = await pdf.embedFont(semiBytes, { subset: true });
  const wide = WIDTH - MARGIN * 2;
  let page: PDFPage = pdf.addPage([WIDTH, HEIGHT]);
  let y = HEIGHT - MARGIN;
  const draw = (text: string, font: PDFFont, size: number, gap = 4, colour = INK, indent = 0, first = "") => {
    wrap(safe(text), font, size, wide - indent).forEach((line, n) => {
      if (y < MARGIN + 30) { page = pdf.addPage([WIDTH, HEIGHT]); y = HEIGHT - MARGIN; }
      if (n === 0 && first) page.drawText(first, { x: MARGIN, y, size, font, color: colour });
      page.drawText(line, { x: MARGIN + indent, y, size, font, color: colour });
      y -= size * 1.5;
    });
    y -= gap;
  };

  draw("IVY & BOUGH", forum, 13, 16, BROWN);
  draw(title, forum, 24, 4);
  draw(`Version ${doc.version_id}`, regular, 9, 16, BROWN);
  for (const block of doc.body.split(/\n\s*\n/)) {
    if (block.startsWith("## ")) { y -= 6; draw(block.slice(3), semi, 11, 4); continue; }
    if (/^(- |\d+\. )/.test(block)) {
      for (const item of block.split("\n")) {
        const m = item.match(/^(- |\d+\. )(.*)$/);
        draw(m ? m[2] : item, regular, 9.5, 2, INK, 16, m ? (m[1] === "- " ? "-" : m[1].trim()) : "");
      }
      y -= 4;
      continue;
    }
    draw(block.replace(/\n/g, " "), regular, 9.5, 6);
  }

  page = pdf.addPage([WIDTH, HEIGHT]);
  y = HEIGHT - MARGIN;
  draw("Signature certificate", forum, 24, 4);
  page.drawRectangle({ x: MARGIN, y, width: 60, height: 1, color: GOLD });
  y -= 22;
  const rows: [string, string][] = [
    ["Reference", r.request_number], ["Document", title], ["Version ID", doc.version_id], ["Document fingerprint (SHA-256)", doc.content_hash],
    ["Signed by", r.signed_name], ["Position", r.signed_position], ["Company", r.signed_company], ["ABN", r.signed_abn || "Not given"], ["Email the link was sent to", r.signer_email],
    ["Sent", whenBrisbane(r.sent_at)], ["First viewed", r.viewed_at ? whenBrisbane(r.viewed_at) : "Not recorded"], ["Signed", `${whenBrisbane(signedAt)} (${new Date(signedAt).toISOString()})`],
    ["IP address", r.ip_address || "Not recorded"], ["Device", r.user_agent.slice(0, 180) || "Not recorded"],
  ];
  for (const [label, value] of rows) { draw(label, semi, 8.5, 0, BROWN); draw(value, regular, 10, 8); }
  y -= 6;
  draw(`${r.signed_name} confirmed they had authority to sign for ${r.signed_company}, agreed to sign electronically, and typed their name as their signature. Ivy & Bough is a trading name of Aurella Group Pty Ltd, ABN 70 649 742 423.`, regular, 9, 0, BROWN);
  return pdf.save();
}
