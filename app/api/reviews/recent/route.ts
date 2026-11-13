import { NextResponse } from "next/server";
import { getRecentReviews } from "@/lib/reviews";

export const revalidate = 300;

export async function GET() {
  const reviews = await getRecentReviews().catch(() => []);
  return NextResponse.json({ reviews }, { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } });
}
