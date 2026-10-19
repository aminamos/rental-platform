"use client";

import Link from "next/link";
import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
      <p className="muted">Use the email and password for your account.</p>
      {error && <div className="error">{error}</div>}
      <form onSubmit={submit} className="panel">
        <label htmlFor="email">Email</label>
        <input
          id="email" type="email" value={email} placeholder="you@example.com"
          onChange={(e) => setEmail(e.target.value)} required
        />
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
      <p className="small muted">
        New install? <Link href="/setup">Create the landlord account</Link>. Tenants: your landlord
        creates your account and shares a temporary password with you.
      </p>
    </div>
  );
}
