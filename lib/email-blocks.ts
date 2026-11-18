// Designed marketing emails. A template body made of "::block" sections renders
// as full-width rows (hero, intro, feature, products, banner) instead of plain paragraphs.
//
// ::hero            image, link, alt
// ::intro           kicker, heading, text, button, link
// ::feature         image, kicker, heading, text, button, link, side (right puts the image on the right)
// ::products        kicker, heading, text, button, link, item: product-slug | short label (repeat)
// ::banner          heading, text, button, link
// ::image           image, link, alt
//
// Use " | " inside a heading for a line break.

type Db = { from: (t: string) => any };

const SERIF = "Forum,Georgia,'Times New Roman',serif";
const SANS = "Montserrat,Arial,Helvetica,sans-serif";
const INK = "#2F2C27", GOLDTEXT = "#A8894F", GOLD = "#C4A265", WINE = "#6B1F2B", PAPER = "#FBF8F2", STONE = "#F3EEE5";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const isBlock = (para: string) => /^::[a-z]+\s*$/m.test(para.split("\n")[0]);

export const hasBlocks = (body: string) => body.split(/\n\s*\n/).some(isBlock);

function parse(para: string) {
  const [head, ...lines] = para.trim().split("\n");
  const fields: Record<string, string> = {};
  const items: string[] = [];
  for (const line of lines) {
    const m = line.match(/^\s*([a-z]+)\s*:\s*(.*)$/i);
    if (!m) continue;
    const k = m[1].toLowerCase();
    if (k === "item") items.push(m[2].trim());
    else fields[k] = m[2].trim();
  }
  return { type: head.trim().slice(2).toLowerCase(), fields, items };
}

const full = (site: string, u = "") => (/^(https?:|mailto:)/.test(u) ? u : `${site}${u.startsWith("/") ? "" : "/"}${u}`);
// Outlook and some mail apps can't show WebP, so every block image is served as a JPEG.
const img = (site: string, u = "", w = 1200) => (/^https?:/.test(u) ? u : `${site}/api/email-img?src=${encodeURIComponent(u)}&w=${w}`);
const heading = (s = "") => esc(s).split(/\s*\|\s*/).join("<br>");
const money = (c: number) => `$${(c / 100).toFixed(2).replace(/\.00$/, "")}`;

const eyebrow = (t: string, align = "center") => (t ? `<div style="font-family:${SANS};font-size:11px;font-weight:400;letter-spacing:3px;text-transform:uppercase;color:${GOLDTEXT};text-align:${align};padding-bottom:12px">${esc(t)}</div>` : "");
const title = (t: string, colour = INK, size = 34, align = "center") => (t ? `<div style="font-family:${SERIF};font-size:${size}px;line-height:1.15;letter-spacing:2px;text-transform:uppercase;color:${colour};text-align:${align};padding-bottom:16px">${heading(t)}</div>` : "");
const text = (t: string, colour = INK, align = "center") => (t ? `<div style="font-family:${SANS};font-size:14px;font-weight:300;line-height:1.7;color:${colour};text-align:${align}">${esc(t).replace(/\n/g, "<br>")}</div>` : "");
const outline = (label: string, href: string, colour = INK) => (label ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:26px auto 0"><tr><td align="center" width="260" style="border:1px solid ${colour}"><a href="${esc(href)}" style="display:block;padding:12px 18px;font-family:${SANS};font-size:12px;letter-spacing:2px;text-transform:uppercase;color:${colour};text-decoration:none;white-space:nowrap">${esc(label)}</a></td></tr></table>` : "");
const outlineLeft = (label: string, href: string) => (label ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0 0"><tr><td style="border:1px solid ${INK}"><a href="${esc(href)}" style="display:block;padding:11px 18px;font-family:${SANS};font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${INK};text-decoration:none;white-space:nowrap">${esc(label)}</a></td></tr></table>` : "");

function block(site: string, para: string) {
  const { type, fields: f, items } = parse(para);
  const link = full(site, f.link || "/shop");
  switch (type) {
    case "hero":
      return `<tr><td style="padding:0;background:linear-gradient(${WINE} 0,${WINE} 70%,${PAPER} 70%);background-color:${WINE}"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding:28px 28px 0"><a href="${esc(link)}"><img src="${img(site, f.image)}" width="544" alt="${esc(f.alt || "")}" style="display:block;width:100%;height:auto;border:0"></a></td></tr></table></td></tr>`;
    case "image":
      return `<tr><td style="padding:30px 28px 0;background:${PAPER}"><a href="${esc(link)}"><img src="${img(site, f.image)}" width="544" alt="${esc(f.alt || "")}" style="display:block;width:100%;height:auto;border:0"></a></td></tr>`;
    case "intro":
      return `<tr><td class="pad" style="padding:44px 48px 46px;background:${PAPER}">${eyebrow(f.kicker)}${title(f.heading)}${text(f.text)}${outline(f.button, link)}</td></tr>`;
    case "feature": {
      const flip = /right/i.test(f.side || "");
      const pic = `<td class="stack" width="50%" valign="middle" dir="ltr" style="padding:20px;background:#ffffff"><a href="${esc(link)}"><img src="${img(site, f.image, 600)}" width="232" alt="${esc(f.heading || "")}" style="display:block;width:100%;height:auto;border:0"></a></td>`;
      const copy = `<td class="stack" width="50%" valign="middle" dir="ltr" style="padding:20px 24px">${eyebrow(f.kicker, "left")}${title(f.heading, INK, 26, "left")}${text(f.text, INK, "left")}${outlineLeft(f.button, link)}</td>`;
      return `<tr><td style="padding:30px 28px 0;background:${PAPER}"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" dir="${flip ? "rtl" : "ltr"}" style="background:${STONE}"><tr>${pic}${copy}</tr></table></td></tr>`;
    }
    case "products": {
      const cells = items.map((raw) => {
        const [slug, label, cents, image] = raw.split("|").map((s) => s.trim());
        if (!image) return "";
        return `<div class="half" style="display:inline-block;vertical-align:top;width:33.33%;box-sizing:border-box;padding:0 8px 22px"><a href="${site}/products/${esc(slug)}" style="text-decoration:none;color:${INK}"><img src="${img(site, image, 400)}" width="164" alt="${esc(label)}" style="display:block;width:100%;height:auto;border:0;background:#ffffff"><div style="padding-top:10px;font-family:${SANS};font-size:12px;font-weight:300;line-height:1.45;color:${INK};text-align:center">${esc(label)}</div>${cents ? `<div style="padding-top:3px;font-family:${SERIF};font-size:15px;color:${INK};text-align:center">${money(Number(cents))}</div>` : ""}</a></div>`;
      }).join("");
      return `<tr><td class="pad" style="padding:52px 40px 6px;background:${PAPER}">${eyebrow(f.kicker)}${title(f.heading, INK, 30)}${text(f.text)}</td></tr><tr><td style="padding:30px 20px 44px;background:${PAPER}"><div style="font-size:0;text-align:center">${cells}</div>${outline(f.button, link)}</td></tr>`;
    }
    case "banner":
      return `<tr><td class="pad" style="padding:48px 48px 50px;background:#3A3733;border-bottom:1px solid ${GOLD}">${title(f.heading, GOLD, 34)}${text(f.text, "#C9C7C2")}${outline(f.button, link, "#D9D6D0")}</td></tr>`;
    default:
      return "";
  }
}

// Plain paragraphs between blocks still work, set in a padded row.
export function renderBlocks(site: string, body: string, paragraph: (p: string) => string) {
  return body.split(/\n\s*\n/).map((p) => (isBlock(p) ? block(site, p) : p.trim() ? `<tr><td class="pad" style="padding:30px 48px 0;background:${PAPER};font-family:${SANS};font-size:14px;font-weight:300;line-height:1.7;color:${INK}">${paragraph(p)}</td></tr>` : "")).join("\n");
}

export function blocksToText(site: string, body: string) {
  return body.split(/\n\s*\n/).map((p) => {
    if (!isBlock(p)) return p;
    const { fields: f, items } = parse(p);
    const lines = [f.kicker, f.heading?.replace(/\s*\|\s*/g, " "), f.text, ...items.map((i) => { const [slug, label, cents] = i.split("|").map((s) => s.trim()); return `${label}${cents ? ` ${money(Number(cents))}` : ""}: ${site}/products/${slug}`; }), f.button ? `${f.button}: ${full(site, f.link || "/shop")}` : ""];
    return lines.filter(Boolean).join("\n");
  }).filter((s) => s.trim()).join("\n\n");
}

// Fills each "item: slug | label" with the live price and first image, so prices are never stale.
export async function hydrateBlocks(db: Db | null, body: string) {
  if (!db || !hasBlocks(body)) return body;
  const slugs = [...body.matchAll(/^\s*item\s*:\s*([^|\n]+)/gim)].map((m) => m[1].trim());
  if (!slugs.length) return body;
  const { data } = await db.from("products").select("slug,name,price_cents,product_images(url,sort_order,media_type)").in("slug", slugs);
  const map = new Map<string, { name: string; price: number | null; image: string }>();
  for (const p of (data ?? []) as { slug: string; name: string; price_cents: number | null; product_images: { url: string; sort_order: number; media_type?: string }[] }[]) {
    const first = [...(p.product_images ?? [])].filter((i) => i.media_type !== "video").sort((a, b) => a.sort_order - b.sort_order)[0];
    map.set(p.slug, { name: p.name, price: p.price_cents, image: first?.url ?? "" });
  }
  return body.replace(/^(\s*item\s*:\s*)([^|\n]+)(?:\|([^\n]*))?$/gim, (_all, pre: string, slug: string, label?: string) => {
    const p = map.get(slug.trim());
    if (!p || !p.image) return "";
    return `${pre}${slug.trim()} | ${(label ?? "").split("|")[0].trim() || p.name} | ${p.price ?? ""} | ${p.image}`;
  });
}
