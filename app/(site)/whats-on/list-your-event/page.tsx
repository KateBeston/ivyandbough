import type { Metadata } from "next";
import Link from "next/link";
import { EventSubmitForm } from "@/components/EventSubmitForm";
import { SITE } from "@/lib/seo";

export const metadata: Metadata = {
  title: "List Your Christmas Event Free | Ivy & Bough",
  description: "Add your Christmas carols, market, light display or festive event to the Ivy & Bough What's On calendar at no cost.",
  alternates: { canonical: `${SITE}/whats-on/list-your-event` },
};

export default function ListYourEventPage() {
  return (
    <div className="wo wo-detail">
      <div className="wo-wrap wo-narrow">
        <p className="wo-crumb"><Link href="/whats-on">What&apos;s On</Link> / List your event</p>
        <h1>List your event free</h1>
        <p className="wo-about">Running carols, a market, a light trail, outdoor movies or a Christmas lunch? Tell us about it and we&apos;ll add it to our What&apos;s On calendar at no cost. We check every listing before it goes live, usually within two business days.</p>
        <EventSubmitForm />
      </div>
    </div>
  );
}
