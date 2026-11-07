import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { SITE_URL } from "./comms";
import { admin } from "./server";

// Modelled on the TGS portal. One publish path serves the button and the schedule.
type Db = NonNullable<ReturnType<typeof admin>>;
export const PORTAL_URL = process.env.PORTAL_URL ?? "https://ivy-and-bough-portal.vercel.app";

// Pinned on purpose, because Meta changes behaviour between versions.
const GRAPH_VERSION = process.env.META_GRAPH_VERSION ?? "v26.0";
const GRAPH = `https://graph.facebook.com/${GRAPH_VERSION}`;
const PINTEREST = "https://api.pinterest.com/v5";
const META_SCOPES = ["pages_show_list", "pages_read_engagement", "pages_manage_posts", "business_management", "ads_management", "ads_read", ...(process.env.META_INSTAGRAM_SCOPES ?? "instagram_basic,instagram_content_publish").split(",").map((s) => s.trim()).filter(Boolean)].join(",");
const PINTEREST_SCOPES = "boards:read,pins:read,pins:write,user_accounts:read";

export const redirectUri = (platform: "meta" | "pinterest") => `${SITE_URL}/api/social/callback/${platform}`;
export const socialStatus = () => ({ meta: Boolean(process.env.META_APP_ID && process.env.META_APP_SECRET), pinterest: Boolean(process.env.PINTEREST_APP_ID && process.env.PINTEREST_APP_SECRET), redirects: { meta: redirectUri("meta"), pinterest: redirectUri("pinterest") } });

const stateKey = () => `social:${process.env.SUPABASE_SECRET_KEY}`;
const sign = (value: string) => createHmac("sha256", stateKey()).update(value).digest("hex");

// Only a portal admin can get a signed state, so a callback can't be started from outside.
export function newState() {
  const value = `${Date.now()}.${randomBytes(12).toString("hex")}`;
  return `${value}.${sign(value)}`;
}

export function validState(state: string | null) {
  const parts = (state ?? "").split(".");
  if (parts.length !== 3) return false;
  const a = Buffer.from(sign(`${parts[0]}.${parts[1]}`));
  const b = Buffer.from(parts[2]);
  return a.length === b.length && timingSafeEqual(a, b) && Date.now() - Number(parts[0]) < 900000;
}

export function connectUrl(platform: "meta" | "pinterest") {
  if (platform === "meta") return `https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth?${new URLSearchParams({ client_id: process.env.META_APP_ID ?? "", redirect_uri: redirectUri("meta"), state: newState(), scope: META_SCOPES, response_type: "code" })}`;
  return `https://www.pinterest.com/oauth/?${new URLSearchParams({ client_id: process.env.PINTEREST_APP_ID ?? "", redirect_uri: redirectUri("pinterest"), state: newState(), scope: PINTEREST_SCOPES, response_type: "code" })}`;
}

async function graphGet<T>(path: string, params: Record<string, string>): Promise<T> {
  const res = await fetch(`${GRAPH}${path}?${new URLSearchParams(params)}`, { cache: "no-store", signal: AbortSignal.timeout(20000) });
  const json = await res.json();
  if (!res.ok || json?.error) throw new Error(json?.error?.message ?? `Meta returned ${res.status}.`);
  return json as T;
}

async function graphPost<T>(path: string, body: Record<string, string>): Promise<T> {
  const res = await fetch(`${GRAPH}${path}`, { method: "POST", cache: "no-store", signal: AbortSignal.timeout(45000), headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(body).toString() });
  const json = await res.json();
  if (!res.ok || json?.error) throw new Error(json?.error?.message ?? `Meta returned ${res.status}.`);
  return json as T;
}

// A Page token made from a long-lived user token doesn't expire. Instagram publishes with its Page's token.
export async function connectMeta(db: Db, code: string) {
  const app = { client_id: process.env.META_APP_ID ?? "", client_secret: process.env.META_APP_SECRET ?? "" };
  const short = await graphGet<{ access_token: string }>("/oauth/access_token", { ...app, redirect_uri: redirectUri("meta"), code });
  const long = await graphGet<{ access_token: string }>("/oauth/access_token", { ...app, grant_type: "fb_exchange_token", fb_exchange_token: short.access_token });
  const pages = await graphGet<{ data: { id: string; name: string; access_token: string; instagram_business_account?: { id: string; username?: string } }[] }>("/me/accounts", { access_token: long.access_token, fields: "id,name,access_token,instagram_business_account{id,username}" });
  const rows = (pages.data ?? []).flatMap((p) => [
    { platform: "meta", account_kind: "facebook_page", external_id: p.id, display_name: p.name, access_token: p.access_token },
    ...(p.instagram_business_account?.id ? [{ platform: "meta", account_kind: "instagram_business", external_id: p.instagram_business_account.id, display_name: p.instagram_business_account.username ? `@${p.instagram_business_account.username}` : `Instagram on ${p.name}`, access_token: p.access_token }] : []),
  ]);
  if (!rows.length) throw new Error("No Facebook Page came back. Check you ticked your Page when connecting, and that it belongs to you or your business.");
  await saveTokens(db, rows.map((r) => ({ ...r, scopes: META_SCOPES })));
  return rows.map((r) => r.display_name);
}

type Token = { id?: string; platform: string; account_kind: string; external_id: string; display_name: string; access_token: string; refresh_token?: string | null; expires_at?: string | null; scopes?: string };

async function saveTokens(db: Db, rows: Token[]) {
  const { error } = await db.from("social_tokens").upsert(rows.map((r) => ({ ...r, is_active: true, last_error: null, connected_at: new Date().toISOString() })), { onConflict: "platform,account_kind,external_id" });
  if (error) throw new Error(error.message);
}

async function pinterestToken(form: Record<string, string>) {
  const basic = Buffer.from(`${process.env.PINTEREST_APP_ID}:${process.env.PINTEREST_APP_SECRET}`).toString("base64");
  const res = await fetch(`${PINTEREST}/oauth/token`, { method: "POST", cache: "no-store", signal: AbortSignal.timeout(20000), headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(form).toString() });
  const json = await res.json();
  if (!res.ok || !json?.access_token) throw new Error(json?.message ?? `Pinterest returned ${res.status}.`);
  return json as { access_token: string; refresh_token?: string; expires_in?: number };
}

const expiresAt = (seconds?: number) => (seconds ? new Date(Date.now() + seconds * 1000).toISOString() : null);

export async function connectPinterest(db: Db, code: string) {
  const token = await pinterestToken({ grant_type: "authorization_code", code, redirect_uri: redirectUri("pinterest") });
  const res = await fetch(`${PINTEREST}/user_account`, { cache: "no-store", headers: { Authorization: `Bearer ${token.access_token}` } });
  const me = await res.json();
  if (!res.ok) throw new Error(me?.message ?? "Pinterest wouldn't share the account.");
  await saveTokens(db, [{ platform: "pinterest", account_kind: "pinterest", external_id: me.username, display_name: me.business_name || me.username, access_token: token.access_token, refresh_token: token.refresh_token ?? null, expires_at: expiresAt(token.expires_in), scopes: PINTEREST_SCOPES }]);
  return [me.username as string];
}

async function liveToken(db: Db, kind: string) {
  const { data } = await db.from("social_tokens").select("*").eq("account_kind", kind).eq("is_active", true).order("connected_at", { ascending: false }).limit(1).maybeSingle();
  const token = data as (Token & { id: string }) | null;
  if (!token || kind !== "pinterest" || !token.refresh_token || !token.expires_at) return token;
  if (new Date(token.expires_at).getTime() > Date.now() + 86400000) return token;
  // Pinterest tokens last about 30 days, so they are renewed as they near the end.
  const fresh = await pinterestToken({ grant_type: "refresh_token", refresh_token: token.refresh_token });
  const update = { access_token: fresh.access_token, refresh_token: fresh.refresh_token ?? token.refresh_token, expires_at: expiresAt(fresh.expires_in) };
  await db.from("social_tokens").update(update).eq("id", token.id);
  return { ...token, ...update };
}

export async function pinterestBoards(db: Db) {
  const token = await liveToken(db, "pinterest");
  if (!token) return [];
  const res = await fetch(`${PINTEREST}/boards?page_size=100`, { cache: "no-store", headers: { Authorization: `Bearer ${token.access_token}` } });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.message ?? "Pinterest wouldn't share the boards.");
  return (json.items ?? []).map((b: { id: string; name: string }) => ({ id: b.id, name: b.name }));
}

type Post = { id: string; caption: string; image_url: string; link_url: string; channels: string[]; pin_title: string; pin_description: string; pinterest_board_id: string };
type Sent = { id: string; permalink: string | null };

async function toFacebook(post: Post, token: Token, image: string): Promise<Sent> {
  const message = post.link_url ? `${post.caption}\n\n${post.link_url}` : post.caption;
  if (image) {
    const r = await graphPost<{ id: string; post_id?: string }>(`/${token.external_id}/photos`, { url: image, caption: message, access_token: token.access_token });
    return { id: r.post_id ?? r.id, permalink: `https://www.facebook.com/${r.post_id ?? r.id}` };
  }
  const r = await graphPost<{ id: string }>(`/${token.external_id}/feed`, { message, access_token: token.access_token });
  return { id: r.id, permalink: `https://www.facebook.com/${r.id}` };
}

async function toInstagram(post: Post, token: Token, image: string): Promise<Sent> {
  if (!image) throw new Error("Instagram needs an image.");
  const container = await graphPost<{ id: string }>(`/${token.external_id}/media`, { image_url: image, caption: post.caption, access_token: token.access_token });
  for (let i = 0; i < 10; i += 1) {
    const check = await graphGet<{ status_code?: string }>(`/${container.id}`, { fields: "status_code", access_token: token.access_token });
    if (check.status_code === "ERROR") throw new Error("Instagram couldn't use this image. It must be a JPEG between 4:5 and 1.91:1.");
    if (check.status_code !== "IN_PROGRESS") break;
    await new Promise((r) => setTimeout(r, 1500));
  }
  const published = await graphPost<{ id: string }>(`/${token.external_id}/media_publish`, { creation_id: container.id, access_token: token.access_token });
  return { id: published.id, permalink: null };
}

async function toPinterest(post: Post, token: Token, image: string): Promise<Sent> {
  if (!image) throw new Error("Pinterest needs an image.");
  if (!post.pinterest_board_id) throw new Error("Choose a Pinterest board.");
  const res = await fetch(`${PINTEREST}/pins`, { method: "POST", cache: "no-store", signal: AbortSignal.timeout(45000), headers: { Authorization: `Bearer ${token.access_token}`, "Content-Type": "application/json" }, body: JSON.stringify({ board_id: post.pinterest_board_id, title: post.pin_title.slice(0, 100) || undefined, description: (post.pin_description || post.caption).slice(0, 800), link: post.link_url || undefined, media_source: { source_type: "image_url", url: image } }) });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.message ?? `Pinterest returned ${res.status}.`);
  return { id: json.id, permalink: `https://www.pinterest.com/pin/${json.id}/` };
}

const SENDERS = { facebook: ["facebook_page", toFacebook], instagram: ["instagram_business", toInstagram], pinterest: ["pinterest", toPinterest] } as const;

export async function publishPost(db: Db, postId: string) {
  const { data: claimed } = await db.from("social_posts").update({ status: "Publishing", last_error: null, updated_at: new Date().toISOString() }).eq("id", postId).in("status", ["Draft", "Scheduled", "Failed", "Partly published"]).select("*").maybeSingle();
  const post = claimed as Post | null;
  if (!post) return { ok: false, error: "This post can't be published right now. It may already be publishing or published." };

  const finish = async (status: string, error: string | null) => {
    await db.from("social_posts").update({ status, last_error: error, updated_at: new Date().toISOString(), ...(status === "Published" ? { published_at: new Date().toISOString() } : {}) }).eq("id", postId);
    return { ok: status === "Published", status, error };
  };
  // The internal title is never published, so an empty caption stops here.
  if (!post.caption.trim()) return finish("Failed", "This post has no caption.");
  if (!post.channels.length) return finish("Failed", "Choose at least one channel.");

  const { data: done } = await db.from("social_publishes").select("channel").eq("post_id", postId).eq("outcome", "Published");
  const sent = new Set((done ?? []).map((d) => d.channel));
  const image = post.image_url.startsWith("/") ? `${SITE_URL}${post.image_url}` : post.image_url;
  const errors: string[] = [];

  for (const channel of post.channels) {
    if (sent.has(channel)) continue; // A retry must never post twice.
    const route = SENDERS[channel as keyof typeof SENDERS];
    try {
      if (!route) throw new Error("There's no publishing route for this channel.");
      const token = await liveToken(db, route[0]);
      if (!token) throw new Error("This account isn't connected.");
      const result = await route[1](post, token, image);
      await db.from("social_publishes").insert({ post_id: postId, channel, outcome: "Published", external_post_id: result.id, permalink: result.permalink });
      sent.add(channel);
    } catch (e) {
      const error = e instanceof Error ? e.message : "The post was refused.";
      errors.push(`${channel}: ${error}`);
      await db.from("social_publishes").insert({ post_id: postId, channel, outcome: "Failed", error });
    }
  }
  if (!errors.length) return finish("Published", null);
  return finish(sent.size ? "Partly published" : "Failed", errors.join(" "));
}
