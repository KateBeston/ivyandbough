import { Footer } from "@/components/Footer";
import { GoogleBadge } from "@/components/GoogleBadge";
import { Nav } from "@/components/Nav";
import { ReviewToast } from "@/components/ReviewToast";
import { getOfferLinks, getStockedCategories, getThemes } from "@/lib/catalogue";
import { getEventAreas } from "@/lib/events";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [themes, categories, offers, eventAreas] = await Promise.all([getThemes(), getStockedCategories(), getOfferLinks(), getEventAreas().catch(() => ({}))]);
  return (
    <>
      <Nav themes={themes} categories={categories} offers={offers} eventAreas={eventAreas} solid />
      {children}
      <Footer />
      <GoogleBadge />
      <ReviewToast />
    </>
  );
}
