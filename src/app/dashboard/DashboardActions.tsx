"use client";

import { useState } from "react";

async function send(url: string, method: string, body: unknown): Promise<string | null> {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    return data.error || "Request failed.";
  }
  return null;
}

export function ReviewButtons({ verificationId }: { verificationId: string }) {
  const [error, setError] = useState("");
  async function review(decision: "approve" | "reject") {
    const err = await send("/api/identity/review", "POST", { verificationId, decision });
    if (err) setError(err);
    else window.location.reload();
  }
  return (
    <span className="actions">
      <button type="button" className="btn small-btn" onClick={() => review("approve")}>Approve</button>
      <button type="button" className="btn danger small-btn" onClick={() => review("reject")}>Reject</button>
      {error && <span className="small">{error}</span>}
    </span>
  );
}

export function MaintenanceControls({
  id,
  status,
  archived,
}: {
  id: string;
  status: string;
  archived: boolean;
}) {
  const [error, setError] = useState("");
  async function patch(body: Record<string, unknown>) {
    const err = await send(`/api/maintenance/${id}`, "PATCH", body);
    if (err) setError(err);
    else window.location.reload();
  }
  return (
    <span className="actions">
      {!archived && (
        <select
          className="inline-select"
          value={status}
          onChange={(e) => patch({ status: e.target.value })}
          aria-label="Maintenance status"
        >
          <option value="open">open</option>
          <option value="in_progress">in progress</option>
          <option value="resolved">resolved</option>
        </select>
      )}
      <button type="button" className="btn secondary small-btn" onClick={() => patch({ archived: !archived })}>
        {archived ? "Restore" : "Archive"}
      </button>
      {error && <span className="small">{error}</span>}
    </span>
  );
}

export function AddDueForm({
  tenants,
}: {
  tenants: { id: string; name: string; unitLabel: string }[];
}) {
  const [tenantId, setTenantId] = useState(tenants[0]?.id || "");
  const [label, setLabel] = useState("Rent — next month");
  const [amountDollars, setAmountDollars] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [error, setError] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const err = await send("/api/dues", "POST", {
      tenantId,
      label,
      amountDollars: Number(amountDollars),
      dueDate: dueDate || undefined,
    });
    if (err) setError(err);
    else window.location.reload();
  }
  return (
    <form onSubmit={submit}>
      {error && <div className="error">{error}</div>}
      <div className="row">
        <div>
          <label htmlFor="due-tenant">Tenant</label>
          <select id="due-tenant" value={tenantId} onChange={(e) => setTenantId(e.target.value)}>
            {tenants.map((t) => (
              <option key={t.id} value={t.id}>{t.name} — {t.unitLabel}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="due-label">Label</label>
          <input id="due-label" value={label} onChange={(e) => setLabel(e.target.value)} required />
        </div>
        <div>
          <label htmlFor="due-amount">Amount (USD)</label>
          <input
            id="due-amount" type="number" min="0.01" step="0.01" value={amountDollars}
            onChange={(e) => setAmountDollars(e.target.value)} required
          />
        </div>
        <div>
          <label htmlFor="due-date">Due date</label>
          <input id="due-date" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </div>
      </div>
      <p style={{ marginTop: 16 }}><button className="btn" type="submit">Add charge</button></p>
    </form>
  );
}
