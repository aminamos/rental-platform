"use client";

import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("tenant@demo.local");
  const [password, setPassword] = useState("demo1234");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      error?: string;
      user?: { role: string };
    };
    setBusy(false);
    if (!res.ok) {
      setError(data.error || "Sign-in failed.");
      return;
    }
    window.location.href = data.user?.role === "landlord" ? "/dashboard" : "/tenant";
  }

  return (
    <div style={{ maxWidth: 480 }}>
      <h1>Sign in</h1>
      <p className="muted">Use a demo account, or your own once you replace the seed data.</p>
      {error && <div className="error">{error}</div>}
      <form onSubmit={submit} className="panel">
        <label htmlFor="email">Email</label>
        <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <p style={{ marginTop: 18 }}>
          <button className="btn" type="submit" disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </p>
      </form>
      <p className="actions">
        <button type="button" className="btn secondary small-btn" onClick={() => setEmail("landlord@demo.local")}>
          Fill landlord demo
        </button>
        <button type="button" className="btn secondary small-btn" onClick={() => setEmail("tenant@demo.local")}>
          Fill tenant demo
        </button>
      </p>
    </div>
  );
}
