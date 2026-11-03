import { Footer } from "@/components/Footer";
import { Nav } from "@/components/Nav";
import { getCategories, getThemes } from "@/lib/catalogue";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [themes, categories] = await Promise.all([getThemes(), getCategories()]);
  return (
    <>
      <Nav themes={themes} categories={categories} solid />
      {children}
      <Footer />
    </>
  );
}
