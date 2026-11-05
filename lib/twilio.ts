import { createHmac, timingSafeEqual } from "crypto";

// Confirms a webhook really came from Twilio, returning its fields if so.
export async function verifiedTwilio(request: Request, url: string) {
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!token) return null;
  const params = [...new URLSearchParams(await request.text()).entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  const signed = url + params.map(([k, v]) => k + v).join("");
  const expected = Buffer.from(createHmac("sha1", token).update(signed).digest("base64"));
  const given = Buffer.from(request.headers.get("x-twilio-signature") ?? "");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  return Object.fromEntries(params);
}
