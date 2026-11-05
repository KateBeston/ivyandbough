import { Footer } from "@/components/Footer";
import { Nav } from "@/components/Nav";
import { getCategories, getOfferLinks, getThemes } from "@/lib/catalogue";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [themes, categories, offers] = await Promise.all([getThemes(), getCategories(), getOfferLinks()]);
  return (
    <>
      <Nav themes={themes} categories={categories} offers={offers} solid />
      {children}
      <Footer />
    </>
  );
}
