import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb, type PDFFont, type PDFPage } from "pdf-lib";

export type InvoiceData = {
  number: string; date: string; customerId: string; transaction: string; paymentMethod: string; billName: string; billEmail: string; deliverName: string; deliverAddress: string;
  items: { name: string; sku?: string; quantity: number; unitPrice: number }[];
  subtotal: number; discount?: number; promoCode?: string; delivery: number; gst: number; total: number;
};

const INK = rgb(0.184, 0.173, 0.153);
const BROWN = rgb(0.416, 0.38, 0.337);
const GOLD = rgb(0.769, 0.635, 0.396);
const LINE = rgb(0.878, 0.847, 0.8);
const SAND = rgb(0.953, 0.933, 0.898);
const WIDTH = 595.28;
const HEIGHT = 841.89;
const MARGIN = 48;

const money = (n: number) => new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(n);

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

export async function buildInvoice(data: InvoiceData, load: (file: string) => Promise<Uint8Array>) {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  pdf.setTitle(`Tax invoice ${data.number}`);
  pdf.setAuthor("Ivy & Bough");
  const [forumBytes, regularBytes, semiBytes, logoBytes] = await Promise.all(["forum.ttf", "montserrat-regular.ttf", "montserrat-semibold.ttf", "logo.png"].map(load));
  const forum = await pdf.embedFont(forumBytes, { subset: true });
  const regular = await pdf.embedFont(regularBytes, { subset: true });
  const semi = await pdf.embedFont(semiBytes, { subset: true });
  const logo = await pdf.embedPng(logoBytes);

  let page: PDFPage = pdf.addPage([WIDTH, HEIGHT]);
  // Logo only, no photo banner, so the invoice prints with little ink.
  const logoWidth = 120;
  const logoHeight = logoWidth * (logo.height / logo.width);
  const bannerHeight = 40 + logoHeight + 16;
  page.drawImage(logo, { x: (WIDTH - logoWidth) / 2, y: HEIGHT - 40 - logoHeight, width: logoWidth, height: logoHeight });

  const text = (t: string, x: number, y: number, size = 9.5, font = regular, color = INK) => page.drawText(t, { x, y, size, font, color });
  const right = (t: string, x: number, y: number, size = 9.5, font = regular, color = INK) => page.drawText(t, { x: x - font.widthOfTextAtSize(t, size), y, size, font, color });
  const spaced = (t: string, x: number, y: number, size: number, gap: number) => {
    let at = x;
    for (const c of t) { page.drawText(c, { x: at, y, size, font: forum, color: INK }); at += forum.widthOfTextAtSize(c, size) + gap; }
  };

  let y = HEIGHT - bannerHeight - 48;
  spaced("TAX INVOICE", MARGIN, y, 22, 3.4);
  right("Invoice number", WIDTH - 150, y + 8, 8, regular, BROWN);
  right(data.number, WIDTH - MARGIN, y + 8, 9.5, semi);
  right("Customer ID", WIDTH - 150, y - 8, 8, regular, BROWN);
  right(data.customerId, WIDTH - MARGIN, y - 8, 9.5, semi);
  right("Date", WIDTH - 150, y - 24, 8, regular, BROWN);
  right(data.date, WIDTH - MARGIN, y - 24, 9.5, semi);

  y -= 40;
  page.drawLine({ start: { x: MARGIN, y }, end: { x: WIDTH - MARGIN, y }, thickness: 0.8, color: GOLD });
  y -= 24;

  const column = (title: string, lines: string[], x: number, width: number) => {
    text(title.toUpperCase(), x, y, 7.5, semi, BROWN);
    let line = y - 15;
    for (const raw of lines) for (const part of wrap(raw, regular, 9.5, width)) { text(part, x, line); line -= 13.5; }
    return line;
  };
  const third = (WIDTH - MARGIN * 2) / 3;
  const ends = [
    column("From", ["Aurella Group Pty Ltd", "trading as Ivy & Bough", "ABN 70 649 742 423"], MARGIN, third - 12),
    column("Bill to", [data.billName, data.billEmail].filter(Boolean), MARGIN + third, third - 12),
    column("Deliver to", [data.deliverName, data.deliverAddress].filter(Boolean), MARGIN + third * 2, third),
  ];
  y = Math.min(...ends) - 18;

  const qtyX = 365;
  const priceX = 450;
  const amountX = WIDTH - MARGIN;
  const head = () => {
    page.drawRectangle({ x: MARGIN, y: y - 8, width: WIDTH - MARGIN * 2, height: 24, color: SAND });
    text("ITEM", MARGIN + 10, y, 7.5, semi, BROWN);
    right("QTY", qtyX, y, 7.5, semi, BROWN);
    right("PRICE", priceX, y, 7.5, semi, BROWN);
    right("AMOUNT", amountX - 10, y, 7.5, semi, BROWN);
    y -= 28;
  };
  head();
  for (const item of data.items) {
    const lines = wrap(item.name, regular, 9.5, qtyX - MARGIN - 50);
    const need = lines.length * 13.5 + 27 + (item.sku ? 12 : 0);
    if (y - need < 170) {
      page = pdf.addPage([WIDTH, HEIGHT]);
      y = HEIGHT - MARGIN - 10;
      head();
    }
    lines.forEach((l, n) => text(l, MARGIN + 10, y - n * 13.5));
    right(String(item.quantity), qtyX, y);
    right(money(item.unitPrice), priceX, y);
    right(money(item.unitPrice * item.quantity), amountX - 10, y);
    if (item.sku) text(`Item no. ${item.sku}`, MARGIN + 10, y - lines.length * 13.5 + 2, 7.5, regular, BROWN);
    const rule = y - (lines.length - 1) * 13.5 - 10 - (item.sku ? 12 : 0);
    page.drawLine({ start: { x: MARGIN, y: rule }, end: { x: WIDTH - MARGIN, y: rule }, thickness: 0.5, color: LINE });
    y = rule - 17;
  }

  y -= 12;
  const paymentTop = y;
  const total = (label: string, value: string, strong = false) => {
    text(label, 340, y, strong ? 11 : 9.5, strong ? semi : regular);
    right(value, amountX - 10, y, strong ? 11 : 9.5, strong ? semi : regular);
    y -= strong ? 18 : 17;
  };
  total("Subtotal", money(data.subtotal));
  if (data.discount) total(`Discount${data.promoCode ? ` (${data.promoCode})` : ""}`, `-${money(data.discount)}`);
  total("Delivery", data.delivery ? money(data.delivery) : "Free");
  y -= 3;
  page.drawLine({ start: { x: 340, y: y + 11 }, end: { x: WIDTH - MARGIN, y: y + 11 }, thickness: 0.8, color: GOLD });
  y -= 6;
  total("Total paid (AUD)", money(data.total), true);
  total("Includes GST of", money(data.gst));

  text("PAYMENT", MARGIN, paymentTop, 7.5, semi, BROWN);
  text(data.paymentMethod || "Card", MARGIN, paymentTop - 15);
  if (data.transaction) {
    text("Transaction number", MARGIN, paymentTop - 33, 7.5, regular, BROWN);
    text(data.transaction, MARGIN, paymentTop - 45, 8);
  }

  const pages = pdf.getPages();
  pages.forEach((p, i) => {
    page = p;
    const centre = (t: string, at: number, size: number, font: PDFFont, color = BROWN) => p.drawText(t, { x: (WIDTH - font.widthOfTextAtSize(t, size)) / 2, y: at, size, font, color });
    if (i === pages.length - 1) centre("Thank you for your order", 92, 15, forum, INK);
    p.drawLine({ start: { x: MARGIN, y: 74 }, end: { x: WIDTH - MARGIN, y: 74 }, thickness: 0.5, color: LINE });
    centre("Paid in full by card through Stripe. Our goods come with guarantees that cannot be excluded under the Australian Consumer Law.", 58, 7, regular);
    centre("Ivy & Bough is a trading name of Aurella Group Pty Ltd, ABN 70 649 742 423.", 46, 7, regular);
    centre("hello@ivyandbough.com  ·  ivyandbough.com", 34, 7, semi);
  });
  return pdf.save();
}
