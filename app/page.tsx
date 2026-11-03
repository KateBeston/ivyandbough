import Image from "next/image";
import Link from "next/link";
import { Countdown } from "@/components/Countdown";
import { Footer } from "@/components/Footer";
import { Hero } from "@/components/Hero";
import { ShopTheLook } from "@/components/ShopTheLook";
import { SignupForm } from "@/components/SignupForm";
import { ProductGrid } from "@/components/ProductGrid";
import { formatDate, getCategories, getDeliveryDates, getProducts, getThemes } from "@/lib/catalogue";

export const revalidate = 60;

const places = [
  { title: "The Table", href: "/shop/tableware", src: "/images/home-table.jpg", alt: "Candlelit table set with gold accents" },
  { title: "The Tree", href: "/shop/tree-decorations", src: "/images/home-tree.jpg", alt: "Softly lit Christmas tree by a fireplace" },
  { title: "The Front Door", href: "/shop/wreaths-garlands", src: "/images/home-door.jpg", alt: "Silver wreath on a black front door" },
];

export default async function HomePage() {
  const [themes, categories, products, dates] = await Promise.all([getThemes(), getCategories(), getProducts(), getDeliveryDates()]);
  return (
    <>
      <Hero themes={themes} categories={categories} />
      <main>
        <section className="intro">
          <div>
            <div className="eyebrow">Welcome</div>
            <h2 className="heading">The pieces you unpack every December. The ones that feel like home.</h2>
            <p>Ivy &amp; Bough brings together elegant, unique Christmas pieces for the table, the tree and the front door.</p>
            <p>Every piece is selected to be kept, and seen and approved by us before it reaches the store.</p>
            <a href="#collections" className="text-link">Find your Christmas</a>
          </div>
          <div className="frame" style={{ height: 620 }}>
            <Image src="/images/theme-woodland.jpg" alt="Lit pillar candles among pine branches and a pine cone" fill sizes="(max-width: 900px) 100vw, 50vw" className="cover" style={{ objectPosition: "40% center" }} />
          </div>
        </section>

        <section id="collections" className="themes">
          <div className="centre">
            <div className="eyebrow">Find your Christmas</div>
            <h2 className="heading">Fourteen ways to dress the home</h2>
          </div>
          <div className="theme-grid">
            {themes.map((t) => (
              <Link key={t.id} href={`/collections/${t.slug}`} className="theme-card">
                <Image src={t.image_url} alt="" fill sizes="(max-width: 760px) 100vw, 20vw" className="cover" style={{ objectPosition: t.card_position }} />
                <div><strong>{t.name}</strong><span>{t.note}</span></div>
              </Link>
            ))}
          </div>
        </section>

        <section className="moment">
          <Image src="/images/fireplace.jpg" alt="Fireplace dressed with garland, fairy lights and knitted stockings" fill sizes="100vw" className="cover" style={{ objectPosition: "center 30%" }} />
          <div className="shade" />
          <div className="moment-inner">
            <Countdown />
            <p>The stockings are out. The candles are lit. The house smells like pine.</p>
          </div>
        </section>

        <section id="home" className="home">
          <div className="eyebrow">Around the home</div>
          <h2 className="heading">From the table to the front door</h2>
          <div className="home-grid">
            {places.map((p) => (
              <Link key={p.title} href={p.href}>
                <div className="frame" style={{ height: 520 }}><Image src={p.src} alt={p.alt} fill sizes="(max-width: 900px) 100vw, 33vw" className="cover" /></div>
                <h3>{p.title}</h3>
              </Link>
            ))}
          </div>
        </section>

        <ShopTheLook productHref={products[0] ? `/products/${products[0].slug}` : "/#edit"} />

        <section id="edit" className="edit">
          <div className="edit-inner">
            <div className="edit-head">
              <h2 className="heading">Christmas Favourites</h2>
              <Link href="/shop" className="text-link">View all</Link>
            </div>
            <ProductGrid products={products} />
          </div>
        </section>

        <section id="delivery" className="delivery">
          <h2 className="heading">Under the tree in time</h2>
          <p>Last order dates for Christmas delivery.</p>
          <div className="delivery-grid">
            {dates.map((d) => (
              <div key={d.region}><small>{d.region}</small><strong>{formatDate(d.last_order_date)}</strong></div>
            ))}
          </div>
        </section>

        <section className="signup">
          <Image src="/images/theme-modern.jpg" alt="" fill sizes="100vw" className="cover" style={{ objectPosition: "center 40%" }} />
          <div className="shade" />
          <div className="signup-inner">
            <h2 className="heading">First look at new pieces</h2>
            <p>New collections and Christmas delivery dates, before anyone else.</p>
            <SignupForm />
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
