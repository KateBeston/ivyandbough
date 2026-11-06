import { getDeliverySummary } from "@/lib/catalogue";
import { publishedVersion } from "@/lib/legal";
import { LegalText } from "./LegalText";

const date = (value: string) => new Intl.DateTimeFormat("en-AU", { dateStyle: "long", timeZone: "Australia/Brisbane" }).format(new Date(value));

export async function LegalPage({ title, code }: { title: string; code: string }) {
  const version = await publishedVersion(code);
  const body = version?.body.includes("{{delivery_summary}}") ? version.body.replaceAll("{{delivery_summary}}", await getDeliverySummary()) : version?.body;
  return (
    <main className="prose legal-page">
      <h1>{title}</h1>
      {version && <p className="muted">Last updated {date(version.published_at)}. Version {version.version_id}</p>}
      {body ? <LegalText text={body} /> : <p>This page is being updated. Please contact us if you need a copy.</p>}
    </main>
  );
}
