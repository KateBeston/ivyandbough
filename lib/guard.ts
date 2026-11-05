// Bot checks for form submissions. Turnstile switches on once its secret key is set.
export async function isHuman(token: unknown, request: Request) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true;
  if (typeof token !== "string" || !token || token.length > 2048) return false;
  const form = new URLSearchParams({ secret, response: token });
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (ip) form.set("remoteip", ip);
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body: form, cache: "no-store", signal: AbortSignal.timeout(5000) });
    return Boolean((await res.json())?.success);
  } catch {
    // If Cloudflare is unreachable, customers still get through. Rate limits remain in place.
    console.warn("Turnstile unavailable");
    return true;
  }
}
