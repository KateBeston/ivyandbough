import { NextResponse } from "next/server";
import { merge, renderEmail, requireAdmin, SAMPLE, SAMPLE_SUMMARY, SITE_URL, smsSegments, summaryValue, toText, withOptOut, type Draft } from "@/lib/comms";

export async function POST(request: Request) {
  if (!(await requireAdmin(request))) return NextResponse.json({ error: "Not allowed." }, { status: 401 });
  const draft = (await request.json().catch(() => null)) as Draft | null;
  if (!draft) return NextResponse.json({ error: "Nothing to preview." }, { status: 400 });
  const values = { ...SAMPLE, ...summaryValue, site_url: SITE_URL, account_url: `${SITE_URL}/account` };
  const body = merge(String(draft.body ?? ""), values);
  const subject = merge(String(draft.subject ?? ""), values);
  const preheader = merge(String(draft.preheader ?? ""), values);
  const text = draft.channel === "SMS" ? withOptOut(toText(body.text, SAMPLE_SUMMARY), draft.message_class === "Marketing") : toText(body.text, SAMPLE_SUMMARY);
  return NextResponse.json({
    subject: subject.text, text, segments: smsSegments(text), missing: [...new Set([...body.missing, ...subject.missing, ...preheader.missing])],
    html: renderEmail({ message_class: draft.message_class, preheader: preheader.text }, body.text, SAMPLE_SUMMARY).replace("{{{ pm:unsubscribe }}}", "#"),
  });
}
