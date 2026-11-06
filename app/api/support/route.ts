import { NextResponse } from "next/server";
import { sendMessage } from "@/lib/comms";
import { isHuman } from "@/lib/guard";
import { allowed } from "@/lib/limits";
import { admin } from "@/lib/server";

const TOPICS = ["Order", "Product", "Delivery", "Returns", "Website problem", "Other"];
const text = (v: unknown, max = 200) => String(v ?? "").trim().slice(0, max);

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  // Hidden field: only bots fill it in, so accept quietly and store nothing.
  if (body?.company) return NextResponse.json({ ok: true, reference: "" });
  const name = text(body?.name, 120);
  const email = text(body?.email, 254).toLowerCase();
  const topic = TOPICS.includes(body?.topic) ? body.topic : "Other";
  const message = text(body?.message, 4000);
  const orderNumber = text(body?.orderNumber, 30);
  const page = text(body?.page, 300);
  if (!name || !message || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return NextResponse.json({ error: "Please add your name, email and what you need help with." }, { status: 400 });
  if (!(await allowed(request, "support", 5, 3600))) return NextResponse.json({ error: "Please try again in a little while, or email hello@ivyandbough.com." }, { status: 429 });
  if (!(await isHuman(body?.token, request))) return NextResponse.json({ error: "We couldn't confirm you're human. Please refresh the page and try again." }, { status: 403 });
  const db = admin();
  if (!db) return NextResponse.json({ error: "That didn't go through. Please email hello@ivyandbough.com." }, { status: 503 });
  const { data: seq } = await db.rpc("next_support_reference");
  const { data: row, error } = await db.from("contact_messages").insert({ name, email, message, topic, order_number: orderNumber, source: "Support assistant", page_url: page, reference: seq }).select("id,reference").single();
  if (error) return NextResponse.json({ error: "That didn't go through. Please email hello@ivyandbough.com." }, { status: 500 });
  const data = { reference: row.reference, first_name: name.split(" ")[0], support_message: message };
  await sendMessage({ slug: "support-confirmation", to: email, data }).catch(() => null);
  await sendMessage({ slug: "support-alert", to: "hello@ivyandbough.com", data: { ...data, topic, customer_name: name, customer_email: email, customer_order: orderNumber || "Not given", page_url: page || "Not given", message_id: row.id, portal_url: process.env.NEXT_PUBLIC_PORTAL_URL ?? "https://ivy-and-bough-portal.vercel.app" } }).catch(() => null);
  return NextResponse.json({ ok: true, reference: row.reference });
}
