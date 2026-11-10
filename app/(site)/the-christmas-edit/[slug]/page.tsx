import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Fragment } from "react";
import { JsonLd } from "@/components/JsonLd";
import { RichText } from "@/components/RichText";
import { absolute } from "@/lib/seo";
import { SignupForm } from "@/components/SignupForm";
import { designStyle, ratio, type ArticleDesign } from "@/lib/article-design";
import { formatPrice, getArticleDesign, getPost, getPosts, getProductsBySlugs, getWelcomeOffer, type PostProduct, type PostSection, type Product } from "@/lib/catalogue";

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
  const label = price ? `${price}${shop ? ` at ${shop}` : ""}` : "View piece";
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
  if (style === "wreath") return <img className="article-divider-wreath" src="/brand/wreath-ink.svg" alt="" width={96} height={96} />;
  if (style === "space") return <div className="article-divider-space" />;
  return <hr className={`article-divider ${style === "short" ? "short" : ""}`} />;
}

// What's in the photo, then who took and styled it.
function Caption({ text, credit, count, className = "article-caption" }: { text?: string; credit?: string; count?: string; className?: string }) {
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
      {!!s.products?.length && <div className={`article-products ${s.columns === 3 ? "three" : ""}`}>{s.products.map((item, n) => <ArticleProduct key={n} item={item} catalogue={catalogue} />)}</div>}
    </section>
  );
}

const isSection = (s?: PostSection) => !!s && (!s.type || s.type === "section");

function autoDivider(design: ArticleDesign, s: PostSection, before?: PostSection) {
  return design.divider !== "none" && isSection(s) && isSection(before) ? <Divider style={design.divider} /> : null;
}

const isPhoto = (s: PostSection) => s.type === "photo" || s.type === "pair";

export default async function PostPage({ params }: Props) {
  const post = await getPost((await params).slug);
  if (!post) notFound();
  const more = (await getPosts()).filter((p) => p.id !== post.id).slice(0, 8);
  const slugs = post.sections.flatMap((s) => (s.products ?? []).flatMap((p) => (p.slug ? [p.slug] : [])));
  const [catalogue, design] = await Promise.all([getProductsBySlugs([...new Set(slugs)]), getArticleDesign()]);
  const stacked = design.heroSide === "stacked";
  // "1/10" under each photo when the article is a numbered list.
  const photoTotal = post.sections.filter(isPhoto).length;
  let photoNo = 0;
  const topics = (post.topics ?? "").split(",").map((t) => t.trim()).filter(Boolean);
  const meta = <JsonLd data={{ "@context": "https://schema.org", "@type": "BlogPosting", headline: post.title, description: post.excerpt, datePublished: post.published_at, image: post.image_url ? absolute(post.image_url) : undefined, author: { "@type": "Organization", name: "Ivy & Bough" }, publisher: { "@type": "Organization", name: "Ivy & Bough", logo: absolute("/icon.png") }, mainEntityOfPage: absolute(`/the-christmas-edit/${post.slug}`) }} />;
  return (
    <main className="article-page" style={designStyle(design)}>
      {stacked ? (
        <header className="post-head">
          <Link href="/the-christmas-edit" className="post-label">{post.category}</Link>
          {meta}
          <h1>{post.title}</h1>
          {post.excerpt && <p className="post-dek">{post.excerpt}</p>}
          <div className="post-byline">By <span>{post.author}</span></div>
          <div className="post-date">{longDate.format(new Date(post.published_at))}</div>
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
              <Link href="/the-christmas-edit" className="eyebrow">{post.category}</Link>
              {meta}
              <h1>{post.title}</h1>
              <p>{post.excerpt}</p>
              <div className="post-meta">By {post.author} | Published: {longDate.format(new Date(post.published_at))}</div>
            </div>
            <div className="frame post-hero-photo">
              <Image src={post.image_url} alt={post.image_alt} fill priority sizes="(max-width: 760px) 100vw, 50vw" className="cover" style={{ objectPosition: post.image_position }} />
            </div>
          </section>
          <Caption text={post.image_caption} credit={post.image_credit} className="post-caption" />
        </>
      )}
      <article className={`article ${design.dropCap ? "drop-cap" : ""} ${stacked ? "stacked" : ""}`}>
        {post.intro && <RichText text={post.intro} />}
        {post.sections.map((s, i) => {
          const count = post.numbered && isPhoto(s) ? `${++photoNo}/${photoTotal}` : undefined;
          return (
            <Fragment key={i}>
              {autoDivider(design, s, post.sections[i - 1])}
              <Block s={s} catalogue={catalogue} count={count} />
            </Fragment>
          );
        })}
        {topics.length > 0 && (
          <div className="article-topics"><span>Topics</span>{topics.map((t) => <span key={t}>{t}</span>)}</div>
        )}
        <section className="article-signup">
          <h2>First look at new pieces</h2>
          <p>New collections and Christmas delivery dates, before anyone else.</p>
          <SignupForm offer={await getWelcomeOffer("Newsletter sign-up")} />
        </section>
      </article>
      {more.length > 0 && (
        <section className="read-more" aria-labelledby="read-more">
          <h2 id="read-more">Read more</h2>
          <div className="read-more-grid">
            {more.map((p) => (
              <Link key={p.id} href={`/the-christmas-edit/${p.slug}`} className="read-more-card">
                <div className="frame"><Image src={p.image_url} alt="" fill sizes="(max-width: 760px) 50vw, 25vw" className="cover" style={{ objectPosition: p.image_position }} /></div>
                <strong>{p.title}</strong>
                <span>By {p.author}</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
