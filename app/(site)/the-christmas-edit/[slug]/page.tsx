import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Fragment } from "react";
import { RichText } from "@/components/RichText";
import { SignupForm } from "@/components/SignupForm";
import { designStyle, ratio, type ArticleDesign } from "@/lib/article-design";
import { formatPrice, getArticleDesign, getPost, getPosts, getProductsBySlugs, getWelcomeOffer, type PostProduct, type PostSection, type Product } from "@/lib/catalogue";

export const revalidate = 60;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = await getPost((await params).slug);
  return { title: post ? `${post.title} | Ivy & Bough` : "Ivy & Bough", description: post?.excerpt };
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

const sizes: Record<string, string> = { small: "article-h-small", large: "article-h-large" };

function Block({ s, catalogue }: { s: PostSection; catalogue: Product[] }) {
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
        {s.credit && <figcaption className="article-credit">{s.credit}</figcaption>}
      </figure>
    );
  }
  if (s.type === "photo") {
    const full = s.width === "full";
    return (
      <figure className={`article-figure ${full ? "article-full" : ""}`}>
        {s.image && <div className="frame article-photo" style={full ? { aspectRatio: "21 / 9" } : { aspectRatio: ratio(s.shape) }}><Image src={s.image} alt={s.alt} fill sizes={full ? "100vw" : "(max-width: 760px) 100vw, 860px"} className="cover" style={{ objectPosition: s.position }} /></div>}
        {s.credit && <figcaption className="article-credit">{s.credit}</figcaption>}
      </figure>
    );
  }
  return (
    <section className={`article-section ${s.align === "center" ? "centre" : ""}`}>
      {s.heading && <h2 className={sizes[s.size ?? ""]}>{s.heading}</h2>}
      {s.image && <div className="frame article-photo" style={{ aspectRatio: ratio(s.shape) }}><Image src={s.image} alt={s.alt} fill sizes="(max-width: 760px) 100vw, 860px" className="cover" style={{ objectPosition: s.position }} /></div>}
      {s.credit && <div className="article-credit">{s.credit}</div>}
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

export default async function PostPage({ params }: Props) {
  const post = await getPost((await params).slug);
  if (!post) notFound();
  const related = (await getPosts()).filter((p) => p.id !== post.id).slice(0, 3);
  const slugs = post.sections.flatMap((s) => (s.products ?? []).flatMap((p) => (p.slug ? [p.slug] : [])));
  const [catalogue, design] = await Promise.all([getProductsBySlugs([...new Set(slugs)]), getArticleDesign()]);
  return (
    <main className="article-page" style={designStyle(design)}>
      <section className={`post-hero ${design.heroSide === "left" ? "photo-left" : ""}`}>
        <div className="post-hero-copy">
          <Link href="/the-christmas-edit" className="eyebrow">{post.category}</Link>
          <h1>{post.title}</h1>
          <p>{post.excerpt}</p>
          <div className="post-meta">By {post.author} | Published: {longDate.format(new Date(post.published_at))}</div>
        </div>
        <div className="frame post-hero-photo">
          <Image src={post.image_url} alt={post.image_alt} fill priority sizes="(max-width: 760px) 100vw, 50vw" className="cover" style={{ objectPosition: post.image_position }} />
        </div>
      </section>
      {post.image_credit && <div className="post-credit">{post.image_credit}</div>}
      <article className="article">
        {post.intro && <RichText text={post.intro} />}
        {related.length > 0 && (
          <aside className="article-related">
            <h2>Related Stories</h2>
            {related.map((p) => (
              <Link key={p.id} href={`/the-christmas-edit/${p.slug}`}>
                <div className="frame"><Image src={p.image_url} alt="" fill sizes="120px" className="cover" style={{ objectPosition: p.image_position }} /></div>
                <span>{p.title}</span>
              </Link>
            ))}
          </aside>
        )}
        {post.sections.map((s, i) => (
          <Fragment key={i}>
            {autoDivider(design, s, post.sections[i - 1])}
            <Block s={s} catalogue={catalogue} />
          </Fragment>
        ))}
        <section className="article-signup">
          <h2 className="heading">First look at new pieces</h2>
          <p>New collections and Christmas delivery dates, before anyone else.</p>
          <SignupForm offer={await getWelcomeOffer("Newsletter sign-up")} />
        </section>
      </article>
    </main>
  );
}
