import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Fragment } from "react";
import { JsonLd } from "@/components/JsonLd";
import { RichText } from "@/components/RichText";
import { absolute } from "@/lib/seo";
import { SignupForm } from "@/components/SignupForm";
import { ShareBar } from "@/components/ShareBar";
import { catHref as categoryHref } from "@/components/EditCards";
import { designStyle, ratio, type ArticleDesign } from "@/lib/article-design";
import { formatPrice, getArticleDesign, getPost, getPostCategories, getPosts, getProductsBySlugs, getProductsInCategories, getWelcomeOffer, type PostProduct, type PostSection, type Product } from "@/lib/catalogue";

export const revalidate = 60;

type Props = { params: Promise<{ slug: string }> };

// Articles are built ahead and refreshed every minute, so they open instantly instead of being made on each visit.
export async function generateStaticParams() {
  return (await getPosts()).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = await getPost((await params).slug);
  if (!post) return { title: "Ivy & Bough" };
  return { title: `${post.title} | Ivy & Bough`, description: post.excerpt, alternates: { canonical: `/the-christmas-edit/${post.slug}` }, openGraph: { type: "article", title: post.title, description: post.excerpt, url: `/the-christmas-edit/${post.slug}`, publishedTime: post.published_at, images: post.image_url ? [post.image_url] : undefined } };
}

const longDate = new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short", year: "numeric", timeZone: "Australia/Brisbane" });

function ArticleProduct({ item, catalogue }: { item: PostProduct; catalogue: Product[] }) {
  const own = item.slug ? catalogue.find((p) => p.slug === item.slug) : undefined;
  if (item.slug && !own) return null;
  const photo = own?.product_images[0];
  const image = own ? photo?.url : item.image;
  const name = own?.name ?? item.name ?? "";
  const url = own ? `/products/${own.slug}` : item.url || "";
  const price = own ? (own.price_cents === null ? "" : formatPrice(own.price_cents)) : item.price;
  const shop = own ? "Ivy & Bough" : item.shop;
  const label = price ? (own ? `${price} · View` : `${price}${shop ? ` at ${shop}` : ""}`) : "View piece";
  const external = url.startsWith("http");
  return (
    <div className="article-product">
      {image && <div className="frame"><Image src={image} alt={own ? photo?.alt ?? name : item.alt ?? name} fill sizes="(max-width: 760px) 50vw, 340px" className="cover" style={{ objectPosition: photo?.position ?? "center" }} /></div>}
      <h3>{name}</h3>
      {url && <a href={url} className="article-buy" {...(external ? { target: "_blank", rel: "noopener nofollow" } : {})}>{label}</a>}
    </div>
  );
}

function Divider({ style }: { style: string }) {
  if (style === "wreath") return <img className="article-divider-wreath" src="/brand/wreath-ink.svg" alt="Ivy & Bough wreath motif" width={96} height={96} />;
  if (style === "space") return <div className="article-divider-space" />;
  return <hr className={`article-divider ${style === "short" ? "short" : ""}`} />;
}

// What's in the photo, then who took and styled it.
// Credit the photographer only: the photo library's name stays in the portal for licence records.
const photographer = (credit?: string) => {
  const c = (credit ?? "").replace(/\s*(\/|\||-|–|via|on)\s*(unsplash|pexels|pixabay)\s*$/i, "").trim();
  return /^(photo:?\s*)?(unsplash|pexels|pixabay)?$/i.test(c) ? "" : c;
};

function Caption({ text, credit: raw, count, className = "article-caption" }: { text?: string; credit?: string; count?: string; className?: string }) {
  const credit = photographer(raw);
  if (!text?.trim() && !credit?.trim() && !count) return null;
  return (
    <figcaption className={className}>
      {text?.trim() && <span className="cap-text">{text.trim()}</span>}{text?.trim() && credit?.trim() ? " " : ""}{credit?.trim() && <span className="cap-credit">{credit.trim()}</span>}
      {count && <span className="cap-count">{count}</span>}
    </figcaption>
  );
}

const sizes: Record<string, string> = { small: "article-h-small", large: "article-h-large" };

function Block({ s, catalogue, count }: { s: PostSection; catalogue: Product[]; count?: string }) {
  if (s.type === "divider") return <Divider style={s.style ?? "line"} />;
  if (s.type === "quote") {
    return (
      <blockquote className="article-quote">
        <p>{s.text}</p>
        {s.note && <footer>{s.note}</footer>}
      </blockquote>
    );
  }
  if (s.type === "pair") {
    return (
      <figure className="article-figure">
        <div className="article-pair">
          {s.image && <div className="frame article-photo"><Image src={s.image} alt={s.alt} fill sizes="(max-width: 760px) 50vw, 400px" className="cover" style={{ objectPosition: s.position }} /></div>}
          {s.image2 && <div className="frame article-photo"><Image src={s.image2} alt={s.alt2 ?? ""} fill sizes="(max-width: 760px) 50vw, 400px" className="cover" style={{ objectPosition: s.position2 }} /></div>}
        </div>
        <Caption text={s.caption} credit={s.credit} count={count} />
      </figure>
    );
  }
  if (s.type === "photo") {
    const full = s.width === "full";
    return (
      <figure className={`article-figure ${full ? "article-full" : ""}`}>
        {s.image && <div className="frame article-photo" style={full ? { aspectRatio: "21 / 9" } : { aspectRatio: ratio(s.shape) }}><Image src={s.image} alt={s.alt} fill sizes={full ? "100vw" : "(max-width: 760px) 100vw, 860px"} className="cover" style={{ objectPosition: s.position }} /></div>}
        <Caption text={s.caption} credit={s.credit} count={count} />
      </figure>
    );
  }
  return (
    <section className={`article-section ${s.align === "center" ? "centre" : ""}`}>
      {s.heading && <h2 className={sizes[s.size ?? ""]}>{s.heading}</h2>}
      {s.image && <div className="frame article-photo" style={{ aspectRatio: ratio(s.shape) }}><Image src={s.image} alt={s.alt} fill sizes="(max-width: 760px) 100vw, 860px" className="cover" style={{ objectPosition: s.position }} /></div>}
      <Caption text={s.caption} credit={s.credit} />
      {s.note && <div className="article-note">{s.note}</div>}
      {s.text && <RichText text={s.text} />}
    </section>
  );
}

const isSection = (s?: PostSection) => !!s && (!s.type || s.type === "section");

function autoDivider(design: ArticleDesign, s: PostSection, before?: PostSection) {
  return design.divider !== "none" && isSection(s) && isSection(before) ? <Divider style={design.divider} /> : null;
}

// "Shop this story" sidebar: the article's own picks first, then the shop section the topic points to.
const TOPICS: { test: RegExp; title: string; ids: string[]; href: string }[] = [
  { test: /candle/i, title: "Shop candles", ids: ["6a5ae688-f33a-4dff-b352-24305de5231c", "fd9b301d-95ad-4424-a243-1dd8652771bf"], href: "/shop/the-table" },
  { test: /light/i, title: "Shop lighting", ids: ["cb53ca67-67aa-4c53-a8d2-ee3aa9d62826", "31aa7884-c9a1-4595-a124-272fc75a18e6", "c6db8266-26eb-4c7d-83e0-3c13e3c7a72d"], href: "/shop/lighting" },
  { test: /gift|stocking|secret santa/i, title: "Shop gifts", ids: ["38861474-d1b6-4a9b-b4b0-14e7ac50b47f", "55972412-5f26-4a08-a11a-a2f684c5ac2e", "da3af48d-0515-4081-a5bb-a9f47bb08b31"], href: "/shop/gifts" },
  { test: /table|dinner|lunch|host|entertain/i, title: "Shop the Christmas table", ids: ["6a5ae688-f33a-4dff-b352-24305de5231c", "953290cd-6caf-4cf4-8a93-a60e5f4d2b6b", "10433bbe-8081-4ab1-a5ee-e7591d2f5348"], href: "/shop/the-table" },
  { test: /wreath|garland|door|mantel/i, title: "Shop wreaths", ids: ["d7c5001b-0a18-4940-8789-0c0a7080c52a", "a5c71925-ac22-4bc0-8625-2e27fe5c7988"], href: "/shop" },
  { test: /tree|bauble|ornament/i, title: "Shop tree decorations", ids: ["9f4df780-6054-4c97-803b-80edcc866639", "9d8ce399-bf0d-46f6-97e6-5f1584382a7e", "021d249f-5153-4cfd-8070-27251ce7f910"], href: "/shop/tree-decorations" },
];
const FALLBACK = { title: "Browse the shop", ids: ["a5c71925-ac22-4bc0-8625-2e27fe5c7988", "9f4df780-6054-4c97-803b-80edcc866639", "6a5ae688-f33a-4dff-b352-24305de5231c"], href: "/shop" };

async function storyPicks(title: string, own: Product[]) {
  const topic = TOPICS.find((t) => t.test.test(title)) ?? FALLBACK;
  const ok = (p: Product) => p.availability !== "Sold out" && !!p.product_images?.[0] && (p.price_from_cents ?? p.price_cents) !== null;
  const seen = new Set<string>();
  const key = (p: Product) => p.name.split(",")[0].trim().toLowerCase();
  const items = own.filter((p) => ok(p) && !seen.has(key(p)) && seen.add(key(p))).slice(0, 3);
  if (items.length < 3) {
    const pool = (await getProductsInCategories(topic.ids, 60)).filter((p) => ok(p) && !seen.has(key(p)));
    for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
    for (const p of pool) { if (items.length >= 3) break; if (!seen.has(key(p))) { seen.add(key(p)); items.push(p); } }
  }
  return { ...topic, items };
}

const isPhoto = (s: PostSection) => s.type === "photo" || s.type === "pair";

export default async function PostPage({ params }: Props) {
  const post = await getPost((await params).slug);
  if (!post) notFound();
  const more = (await getPosts()).filter((p) => p.id !== post.id).slice(0, 8);
  const slugs = post.sections.flatMap((s) => (s.products ?? []).flatMap((p) => (p.slug ? [p.slug] : [])));
  const [catalogue, design, cats] = await Promise.all([getProductsBySlugs([...new Set(slugs)]), getArticleDesign(), getPostCategories()]);
  const story = await storyPicks(post.title, slugs.map((sl) => catalogue.find((c) => c.slug === sl)).filter((x): x is Product => !!x));
  const cat = cats.find((c) => c.name === post.category);
  const catHref = cat ? `/the-christmas-edit/category/${cat.slug}` : "/the-christmas-edit";
  const stacked = design.heroSide === "stacked";
  // "1/10" under each photo when the article is a numbered list.
  const photoTotal = post.sections.filter(isPhoto).length;
  let photoNo = 0;
  // Advice first: product suggestions are gathered into one small "From Ivy & Bough" section after the article.
  // Gift guides keep their groups (e.g. "For the host"); other posts get one tidy, de-duplicated row.
  const grouped = /gift/.test(post.slug);
  const seen = new Set<string>();
  const picks = post.sections
    .filter((sec) => sec.products?.length)
    .map((sec) => ({ heading: grouped ? sec.heading : "", items: (sec.products ?? []).filter((it) => { const k = it.slug || it.url || it.name || ""; if (seen.has(k)) return false; seen.add(k); return true; }) }))
    .filter((g) => g.items.length)
    .reduce<{ heading: string; items: PostProduct[] }[]>((acc, g) => (grouped || !acc.length ? [...acc, g] : [{ heading: "", items: [...acc[0].items, ...g.items] }]), []);
  const faqs = (post.faqs ?? []).filter((f) => f?.q && f?.a);
  const topics = (post.topics ?? "").split(",").map((t) => t.trim()).filter(Boolean);
  const meta = <JsonLd data={{ "@context": "https://schema.org", "@type": "BlogPosting", headline: post.title, description: post.excerpt, datePublished: post.published_at, image: post.image_url ? absolute(post.image_url) : undefined, author: { "@type": "Organization", name: "Ivy & Bough" }, publisher: { "@type": "Organization", name: "Ivy & Bough", logo: absolute("/icon.png") }, mainEntityOfPage: absolute(`/the-christmas-edit/${post.slug}`) }} />;
  const share = <ShareBar url={absolute(`/the-christmas-edit/${post.slug}`)} title={post.title} text={post.excerpt} image={post.image_url ? absolute(post.image_url) : undefined} />;
  return (
    <main className="article-page" style={designStyle(design)}>
      {stacked ? (
        <header className="post-head">
          <Link href={catHref} className="post-label">{post.category}</Link>
          {meta}
          <h1>{post.title}</h1>
          {post.excerpt && <p className="post-dek">{post.excerpt}</p>}
          <div className="post-byline">By <span>{post.author}</span></div>
          <div className="post-date">{longDate.format(new Date(post.published_at))}</div>
          {share}
          {post.image_url && (
            <figure className="post-head-figure">
              <div className="frame post-head-photo"><Image src={post.image_url} alt={post.image_alt} fill priority sizes="(max-width: 760px) 100vw, 860px" className="cover" style={{ objectPosition: post.image_position }} /></div>
              <Caption text={post.image_caption} credit={post.image_credit} />
            </figure>
          )}
        </header>
      ) : (
        <>
          <section className={`post-hero ${design.heroSide === "left" ? "photo-left" : ""}`}>
            <div className="post-hero-copy">
              <Link href={catHref} className="eyebrow">{post.category}</Link>
              {meta}
              <h1>{post.title}</h1>
              <p>{post.excerpt}</p>
              <div className="post-meta">By {post.author} | Published: {longDate.format(new Date(post.published_at))}</div>
              {share}
            </div>
            <div className="frame post-hero-photo">
              <Image src={post.image_url} alt={post.image_alt} fill priority sizes="(max-width: 760px) 100vw, 50vw" className="cover" style={{ objectPosition: post.image_position }} />
            </div>
          </section>
          <Caption text={post.image_caption} credit={post.image_credit} className="post-caption" />
        </>
      )}
      <div className="article-shell">
      <article className={`article ${design.dropCap ? "drop-cap" : ""} ${stacked ? "stacked" : ""}`}>
        {post.intro && <RichText text={post.intro} />}
        {(post.summary ?? []).length > 0 && (
          <aside className="article-summary" aria-label="In short">
            <h2>In short</h2>
            <ul>{(post.summary ?? []).map((t) => <li key={t}>{t}</li>)}</ul>
          </aside>
        )}
        {post.sections.map((s, i) => {
          const count = post.numbered && isPhoto(s) ? `${++photoNo}/${photoTotal}` : undefined;
          return (
            <Fragment key={i}>
              {autoDivider(design, s, post.sections[i - 1])}
              <Block s={s} catalogue={catalogue} count={count} />
            </Fragment>
          );
        })}
        {picks.length > 0 && (
          <section className="article-picks" aria-labelledby="article-picks">
            <h2 id="article-picks">From Ivy &amp; Bough</h2>
            {picks.map((g, gi) => (
              <Fragment key={gi}>
                {g.heading && <h3 className="article-picks-group">{g.heading}</h3>}
                <div className="article-products small">{g.items.map((item, n) => <ArticleProduct key={n} item={item} catalogue={catalogue} />)}</div>
              </Fragment>
            ))}
          </section>
        )}
        {faqs.length > 0 && (
          <section className="article-faq" aria-labelledby="article-faq">
            <JsonLd data={{ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) }} />
            <h2 id="article-faq">Frequently asked questions</h2>
            {faqs.map((f) => (
              <details key={f.q}>
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </section>
        )}
        {post.author_note && (
          <section className="article-about" aria-labelledby="article-about">
            <h2 id="article-about">About {post.author}</h2>
            <p>{post.author_note}</p>
          </section>
        )}
        {topics.length > 0 && (
          <div className="article-topics"><span>Topics</span>{topics.map((t) => <span key={t}>{t}</span>)}</div>
        )}
        <div className="article-share-end">{share}</div>
        <section className="article-signup">
          <h2>First look at new pieces</h2>
          <p>New collections and Christmas delivery dates, before anyone else.</p>
          <SignupForm offer={await getWelcomeOffer("Newsletter sign-up")} />
        </section>
      </article>
      {story.items.length > 0 && (
        <aside className="story-shop" aria-label="Shop this story">
          <div className="story-shop-in">
            <p className="eyebrow">Shop this story</p>
            {story.items.map((p) => (
              <Link key={p.id} href={`/products/${p.slug}`} className="story-shop-item">
                <Image src={p.product_images[0].url} alt={p.product_images[0].alt || p.name} width={220} height={220} sizes="200px" quality={75} />
                <strong>{p.name.split(",")[0]}</strong>
                <span>{p.price_from_cents ? `From ${formatPrice(p.price_from_cents)}` : formatPrice(p.price_cents)}</span>
              </Link>
            ))}
            <Link href={story.href} className="story-shop-more">{story.title}</Link>
          </div>
        </aside>
      )}
      </div>
      {more.length > 0 && (
        <section className="read-more" aria-labelledby="read-more">
          <h2 id="read-more">Read more</h2>
          <div className="read-more-grid">
            {more.map((p) => (
              <div key={p.id} className="read-more-card">
                <Link href={`/the-christmas-edit/${p.slug}`} tabIndex={-1} aria-hidden="true" className="frame"><Image src={p.image_url} alt={p.image_alt || p.title} fill sizes="(max-width: 760px) 50vw, 25vw" className="cover" style={{ objectPosition: p.image_position }} /></Link>
                {p.category && <Link href={categoryHref(p.category)} className="edit-label">{p.category}</Link>}
                <Link href={`/the-christmas-edit/${p.slug}`} className="read-more-title"><strong>{p.title}</strong></Link>
                <span>By {p.author}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
