import { NextResponse } from "next/server";
import { merge, renderEmail, requireAdmin, SAMPLE, SITE_URL, smsSegments, toText, type Draft } from "@/lib/comms";

export async function POST(request: Request) {
  if (!(await requireAdmin(request))) return NextResponse.json({ error: "Not allowed." }, { status: 401 });
  const draft = (await request.json().catch(() => null)) as Draft | null;
  if (!draft) return NextResponse.json({ error: "Nothing to preview." }, { status: 400 });
  const values = { ...SAMPLE, site_url: SITE_URL, account_url: `${SITE_URL}/account` };
  const body = merge(String(draft.body ?? ""), values);
  const subject = merge(String(draft.subject ?? ""), values);
  const preheader = merge(String(draft.preheader ?? ""), values);
  const text = toText(body.text);
  return NextResponse.json({
    subject: subject.text, text, segments: smsSegments(text), missing: [...new Set([...body.missing, ...subject.missing, ...preheader.missing])],
    html: renderEmail({ message_class: draft.message_class, preheader: preheader.text }, body.text).replace("{{{ pm:unsubscribe }}}", "#"),
  });
}
