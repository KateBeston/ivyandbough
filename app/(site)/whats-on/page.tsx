import type { Metadata } from "next";
import { Suspense } from "react";
import { EventsBrowser } from "@/components/EventsBrowser";
import { getEvents } from "@/lib/events";
import { SITE } from "@/lib/seo";

export const revalidate = 600;

export const metadata: Metadata = {
  title: "What's On This Christmas in Brisbane | Ivy & Bough",
  description: "Christmas carols, light displays, markets, outdoor movies and festive dining around Brisbane and South East Queensland, updated weekly.",
  alternates: { canonical: `${SITE}/whats-on` },
};

export default async function WhatsOnPage() {
  const events = await getEvents();
  return (
    <div className="wo">
      <Suspense><EventsBrowser events={events} /></Suspense>
    </div>
  );
}
