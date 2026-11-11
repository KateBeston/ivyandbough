"use client";

import { useState, type FormEvent } from "react";
import { account } from "@/lib/account-client";
import { Honeypot } from "@/components/Honeypot";

export default function ResetPage() {
  const [msg, setMsg] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    if (fd.get("company")) return;
    const password = String(fd.get("password"));
    const { error } = await account.auth.updateUser({ password });
    setMsg(error ? "That link has expired. Please request a new one." : "Your password has been updated.");
  }
  return (
    <main className="shop-page account-narrow">
      <h1 className="heading">Choose a new password</h1>
      <form className="account-form" onSubmit={submit}>
        {msg && <p role="status">{msg}</p>}
        <Honeypot />
        <label>New password<input name="password" type="password" required minLength={8} autoComplete="new-password" /></label>
        <button className="solid">Update password</button>
      </form>
    </main>
  );
}
