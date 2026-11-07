import type { Metadata } from "next";
import { ShopList, under } from "@/components/ShopList";

export const revalidate = 60;
export const metadata: Metadata = { title: "Christmas Gifts Under $25 | Ivy & Bough", description: "Christmas gifts and decorations under $25, chosen by Ivy & Bough. Delivered across Australia.", alternates: { canonical: "/shop/gifts-under-25" } };

export default function Page() {
  return <ShopList title="Gifts under $25" intro="Considered Christmas gifts and pieces, all $25 or less." pick={under(25)} />;
}
