import type { Metadata } from "next";
import { ShopList, under } from "@/components/ShopList";

export const revalidate = 60;
export const metadata: Metadata = { title: "Christmas Gifts Under $50 | Ivy & Bough", description: "Christmas gifts and decorations under $50, chosen by Ivy & Bough. Delivered across Australia.", alternates: { canonical: "/shop/gifts-under-50" } };

export default function Page() {
  return <ShopList title="Gifts under $50" intro="Considered Christmas gifts and pieces, all $50 or less." pick={under(50)} />;
}
