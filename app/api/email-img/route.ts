import sharp from "sharp";

// Email images as JPEG, because Outlook and some mail apps can't show WebP.
// Only the site's own /images and /email files, fetched from the static host.
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const src = params.get("src") ?? "";
  const width = Math.min(Math.max(Number(params.get("w")) || 1200, 100), 1600);
  if (!/^\/(images|email)\/[\w\-./]+\.(jpe?g|png|webp)$/i.test(src) || src.includes("..")) return new Response("Not found", { status: 404 });
  try {
    const res = await fetch(new URL(src, request.url));
    if (!res.ok) return new Response("Not found", { status: 404 });
    const file = Buffer.from(await res.arrayBuffer());
    const out = await sharp(file).resize({ width, withoutEnlargement: true }).flatten({ background: "#ffffff" }).jpeg({ quality: 82, mozjpeg: true }).toBuffer();
    return new Response(new Uint8Array(out), { headers: { "Content-Type": "image/jpeg", "Cache-Control": "public, max-age=31536000, immutable" } });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
