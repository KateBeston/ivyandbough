import { NextResponse } from "next/server";

// Approximate Australian state from Vercel's network location headers. Nothing is stored.
const STATES = ["QLD", "NSW", "VIC", "SA", "WA", "TAS", "ACT", "NT"];

export async function GET(request: Request) {
  const country = request.headers.get("x-vercel-ip-country") ?? "";
  const region = (request.headers.get("x-vercel-ip-country-region") ?? "").toUpperCase();
  const state = country === "AU" && STATES.includes(region) ? region : null;
  return NextResponse.json({ state }, { headers: { "Cache-Control": "private, no-store" } });
}
