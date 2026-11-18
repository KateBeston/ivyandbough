"use client";

import { useState, type FormEvent } from "react";
import { Honeypot } from "./Honeypot";
import { Turnstile, TURNSTILE_ON } from "./Turnstile";
import { EVENT_AREAS, EVENT_TYPES, STATE_NAMES } from "@/lib/events";

export function EventSubmitForm() {
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [message, setMessage] = useState("");
  const [token, setToken] = useState("");
  const [attempt, setAttempt] = useState(0);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState("sending");
    const form = e.currentTarget;
    const body = Object.fromEntries(new FormData(form).entries());
    const res = await fetch("/api/events", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...body, token }) }).catch(() => null);
    setAttempt((n) => n + 1);
    const json = (await res?.json().catch(() => null)) as { error?: string } | null;
    if (res?.ok) { form.reset(); setState("done"); }
    else { setMessage(json?.error ?? "That didn't go through. Please try again."); setState("error"); }
  }

  if (state === "done") return <div className="wo-box"><h3>Thank you</h3><p>We&apos;ve received your event. We&apos;ll check the details and let you know once it&apos;s live.</p></div>;

  return (
    <form className="wo-form" onSubmit={submit}>
      <h2>The event</h2>
      <label className="wide">Event name<input name="name" required maxLength={140} /></label>
      <label>Type<select name="event_type" required defaultValue=""><option value="" disabled>Choose</option>{EVENT_TYPES.map((t) => <option key={t}>{t}</option>)}</select></label>
      <label>Cost<select name="price_text" defaultValue="Free"><option>Free</option><option>Free entry</option><option>Ticketed</option><option>Bookings required</option></select></label>
      <label>Starts<input name="start_date" type="date" required /></label>
      <label>Ends (if more than one day)<input name="end_date" type="date" /></label>
      <label className="wide">Times<input name="time_text" placeholder="e.g. 6pm to 9pm" maxLength={120} /></label>
      <label className="wide">About the event<textarea name="about" rows={4} required maxLength={800} /></label>
      <label className="wide">Event website<input name="official_url" type="url" placeholder="https://" /></label>
      <label className="wide">Ticket booking link (if ticketed)<input name="booking_url" type="url" placeholder="https://" /></label>
      <label className="wide">Photo link<input name="image_url" type="url" placeholder="https:// (or email your photo to hello@ivyandbough.com)" /></label>
      <h2>Where</h2>
      <label className="wide">Venue<input name="venue" required maxLength={140} /></label>
      <label>Suburb<input name="suburb" required maxLength={80} /></label>
      <label>State<select name="state" defaultValue="QLD">{Object.keys(STATE_NAMES).map((s) => <option key={s} value={s}>{s}</option>)}</select></label>
      <label>Area (Queensland)<select name="region" defaultValue="Brisbane City">{EVENT_AREAS.map((a) => <option key={a}>{a}</option>)}<option>Other Queensland</option><option>Outside Queensland</option></select></label>
      <h2>Your details</h2>
      <label>Organisation<input name="organiser_name" required maxLength={140} /></label>
      <label>Your name<input name="organiser_contact" required maxLength={100} /></label>
      <label>Email<input name="organiser_email" type="email" required maxLength={254} /></label>
      <label>Phone<input name="organiser_phone" type="tel" maxLength={30} /></label>
      <label className="wide check"><input type="checkbox" name="rights" required /> I&apos;m the organiser or have their permission, and I have the right to share these details and any photo.</label>
      <Honeypot />
      <Turnstile onToken={setToken} resetKey={attempt} />
      <button type="submit" className="wo-btn dark" disabled={state === "sending" || (TURNSTILE_ON && !token)}>{state === "sending" ? "Sending…" : "Submit my event"}</button>
      {state === "error" && <p className="wo-note" role="alert">{message}</p>}
    </form>
  );
}
