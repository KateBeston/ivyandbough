import { Footer } from "@/components/Footer";
import { GoogleBadge } from "@/components/GoogleBadge";
import { Nav } from "@/components/Nav";
import { getOfferLinks, getStockedCategories, getThemes } from "@/lib/catalogue";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [themes, categories, offers] = await Promise.all([getThemes(), getStockedCategories(), getOfferLinks()]);
  return (
    <>
      <Nav themes={themes} categories={categories} offers={offers} solid />
      {children}
      <Footer />
      <GoogleBadge />
    </>
  );
}
