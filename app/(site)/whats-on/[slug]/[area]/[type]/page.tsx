import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EventListing } from "@/components/EventListing";
import { eventPage, eventPageMeta } from "@/lib/event-pages";

export const revalidate = 120;
type Props = { params: Promise<{ slug: string; area: string; type: string }> };

// /whats-on/qld/gold-coast/carols: one kind of event in one area.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, area, type } = await params;
  const page = await eventPage(slug, area, type);
  return page ? eventPageMeta(page) : {};
}

export default async function Page({ params }: Props) {
  const { slug, area, type } = await params;
  const page = await eventPage(slug, area, type);
  if (!page) notFound();
  return <EventListing page={page} />;
}
