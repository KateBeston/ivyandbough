import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EventListing } from "@/components/EventListing";
import { eventPage, eventPageMeta } from "@/lib/event-pages";

export const revalidate = 120;
// Built on first visit, then cached and refreshed in the background (without this, Next.js rebuilds the page on every visit).
export async function generateStaticParams() { return []; }
type Props = { params: Promise<{ slug: string; area: string }> };

// /whats-on/qld/gold-coast (an area) or /whats-on/qld/carols (a type across the state).
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, area } = await params;
  const page = await eventPage(slug, area);
  return page ? eventPageMeta(page) : {};
}

export default async function Page({ params }: Props) {
  const { slug, area } = await params;
  const page = await eventPage(slug, area);
  if (!page) notFound();
  return <EventListing page={page} />;
}
