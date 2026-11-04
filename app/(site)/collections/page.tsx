import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getThemes } from "@/lib/catalogue";

export const revalidate = 60;
export const metadata: Metadata = { title: "Christmas Decorating Themes and Collections | Ivy & Bough", description: "Explore Christmas decorating collections from traditional and vintage to Australian native, minimalist and colourful. Delivered Australia-wide." };

export default async function CollectionsPage() {
  const themes = await getThemes();
  return (
    <main className="collection-body">
      <div className="collections-head">
        <h1 className="heading">All collections</h1>
        <p>However you like to do Christmas, there&apos;s a look here for it. Browse every collection, then choose the one that suits your home.</p>
      </div>
      <div className="collections-index">
        {themes.map((t) => (
          <Link key={t.id} href={`/collections/${t.slug}`}>
            <div className="frame"><Image src={t.image_url} alt="" fill sizes="(max-width: 760px) 50vw, 25vw" className="cover" style={{ objectPosition: t.card_position }} /></div>
            <strong>{t.name}</strong>
            <span>{t.note}</span>
          </Link>
        ))}
      </div>
    </main>
  );
}
