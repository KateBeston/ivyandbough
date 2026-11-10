import Image from "next/image";

export function CollectionHero({ title, intro, src, alt, position }: { title: string; intro: string; src: string; alt: string; position: string }) {
  return (
    <section className="collection-hero">
      {src ? <Image src={src} alt={alt} fill priority sizes="100vw" className="cover" style={{ objectPosition: position }} /> : null}
      <div className="shade" />
      <div className="collection-inner">
        <h1>{title}</h1>
        <p>{intro}</p>
      </div>
    </section>
  );
}
