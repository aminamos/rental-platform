"use client";

import { useState } from "react";

export default function SetupForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/auth/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    setBusy(false);
    if (!res.ok) {
      setError(data.error || "Setup failed.");
      return;
    }
    window.location.href = "/dashboard";
  }

  return (
    <form onSubmit={submit} className="panel">
      {error && <div className="error">{error}</div>}
      <label htmlFor="setup-name">Your name</label>
      <input id="setup-name" value={name} onChange={(e) => setName(e.target.value)} required />
      <label htmlFor="setup-email">Email</label>
      <input
        id="setup-email" type="email" value={email} placeholder="you@example.com"
        onChange={(e) => setEmail(e.target.value)} required
      />
      <label htmlFor="setup-password">Password (at least 8 characters)</label>
      <input
        id="setup-password" type="password" value={password}
        onChange={(e) => setPassword(e.target.value)} required minLength={8}
      />
      <p style={{ marginTop: 18 }}>
        <button className="btn" type="submit" disabled={busy}>
          {busy ? "Creating account…" : "Create landlord account"}
        </button>
      </p>
    </form>
  );
}
