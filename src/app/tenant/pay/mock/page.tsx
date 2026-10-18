"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";

function MockCheckout() {
  const params = useSearchParams();
  const paymentId = params.get("paymentId") || "";
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function confirm() {
    setBusy(true);
    const res = await fetch("/api/payments/mock-complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentId }),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error || "Payment could not be completed.");
      setBusy(false);
      return;
    }
    window.location.href = "/tenant";
  }

  return (
    <div style={{ maxWidth: 560 }}>
      <h1>Demo checkout</h1>
      <div className="panel wash">
        <p>
          Stripe keys are not configured in this environment, so this page stands in for Stripe
          Checkout. <strong>No card is charged.</strong> Add Stripe test keys in{" "}
          <code>.env.local</code> (see <code>.env.example</code>) and this same Pay button will
          open real Stripe Checkout in test mode instead.
        </p>
        {error && <div className="error">{error}</div>}
        <p className="actions">
          <button type="button" className="btn" onClick={confirm} disabled={busy || !paymentId}>
            {busy ? "Completing…" : "Confirm test payment"}
          </button>
          <a className="btn secondary" href="/tenant">Cancel</a>
        </p>
      </div>
    </div>
  );
}

export default function MockPayPage() {
  return (
    <Suspense fallback={<p>Loading checkout…</p>}>
      <MockCheckout />
    </Suspense>
  );
}
