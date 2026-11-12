import type { Metadata } from "next";
import { ColourLinks } from "@/components/ColourLinks";
import { ShopBrowser } from "@/components/ShopBrowser";
import { getStockedCategories, getProducts, getThemes } from "@/lib/catalogue";

export const revalidate = 60;
export const metadata: Metadata = { title: "Shop Christmas Decorations | Ivy & Bough", description: "Shop all Christmas decorations by category, collection, colour, material and price. Delivered Australia-wide.", alternates: { canonical: "/shop" } };

export default async function ShopPage() {
  const [categories, products, themes] = await Promise.all([getStockedCategories(), getProducts(), getThemes()]);
  return (
    <>
      <ShopBrowser products={products} categories={categories} themes={themes} />
      <ColourLinks />
    </>
  );
}
