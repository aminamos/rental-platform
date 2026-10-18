"use client";

import { useState } from "react";

async function sendJson(url: string, method: string, body: unknown) {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return { ok: res.ok, data };
}

export function PayButton({ dueId }: { dueId: string }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function pay() {
    setBusy(true);
    const { ok, data } = await sendJson("/api/payments/checkout", "POST", { dueId });
    if (!ok || typeof data.url !== "string") {
      setError(typeof data.error === "string" ? data.error : "Could not start checkout.");
      setBusy(false);
      return;
    }
    window.location.href = data.url;
  }
  return (
    <span className="actions">
      <button type="button" className="btn small-btn" onClick={pay} disabled={busy}>
        {busy ? "Starting…" : "Pay now"}
      </button>
      {error && <span className="small">{error}</span>}
    </span>
  );
}

export function IdentityForm() {
  const [documentType, setDocumentType] = useState("driver_license");
  const [documentName, setDocumentName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { ok, data } = await sendJson("/api/identity/start", "POST", { documentType, documentName });
    if (!ok) {
      setError(typeof data.error === "string" ? data.error : "Could not start verification.");
      setBusy(false);
      return;
    }
    if (typeof data.url === "string" && data.url) {
      window.location.href = data.url;
      return;
    }
    window.location.reload();
  }
  return (
    <form onSubmit={submit}>
      {error && <div className="error">{error}</div>}
      <p className="small muted">
        With Stripe keys configured this opens Stripe Identity. Without them, enter the document
        you would upload and your landlord reviews it manually. No file is actually uploaded in
        this MVP — only the file name is recorded.
      </p>
      <div className="row">
        <div>
          <label htmlFor="doc-type">Document type</label>
          <select id="doc-type" value={documentType} onChange={(e) => setDocumentType(e.target.value)}>
            <option value="driver_license">Driver license</option>
            <option value="passport">Passport</option>
            <option value="state_id">State ID</option>
          </select>
        </div>
        <div>
          <label htmlFor="doc-name">Document file name</label>
          <input
            id="doc-name" value={documentName} onChange={(e) => setDocumentName(e.target.value)}
            placeholder="license-front.jpg"
          />
        </div>
      </div>
      <p style={{ marginTop: 16 }}>
        <button className="btn" type="submit" disabled={busy}>
          {busy ? "Starting…" : "Start verification"}
        </button>
      </p>
    </form>
  );
}

export function MaintenanceForm() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("plumbing");
  const [priority, setPriority] = useState("normal");
  const [error, setError] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const { ok, data } = await sendJson("/api/maintenance", "POST", {
      title, description, category, priority,
    });
    if (!ok) {
      setError(typeof data.error === "string" ? data.error : "Could not submit request.");
      return;
    }
    window.location.reload();
  }
  return (
    <form onSubmit={submit}>
      {error && <div className="error">{error}</div>}
      <label htmlFor="maint-title">Title</label>
      <input id="maint-title" value={title} onChange={(e) => setTitle(e.target.value)} required />
      <label htmlFor="maint-desc">What is happening?</label>
      <textarea id="maint-desc" value={description} onChange={(e) => setDescription(e.target.value)} required />
      <div className="row">
        <div>
          <label htmlFor="maint-cat">Category</label>
          <select id="maint-cat" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="plumbing">Plumbing</option>
            <option value="electrical">Electrical</option>
            <option value="appliance">Appliance</option>
            <option value="heating_cooling">Heating / cooling</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label htmlFor="maint-pri">Priority</label>
          <select id="maint-pri" value={priority} onChange={(e) => setPriority(e.target.value)}>
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>
      </div>
      <p style={{ marginTop: 16 }}><button className="btn" type="submit">Submit request</button></p>
    </form>
  );
}

export function ArchiveButton({ id, archived }: { id: string; archived: boolean }) {
  const [error, setError] = useState("");
  async function toggle() {
    const { ok, data } = await sendJson(`/api/maintenance/${id}`, "PATCH", { archived: !archived });
    if (!ok) {
      setError(typeof data.error === "string" ? data.error : "Could not update request.");
      return;
    }
    window.location.reload();
  }
  return (
    <span className="actions">
      <button type="button" className="btn secondary small-btn" onClick={toggle}>
        {archived ? "Restore" : "Archive"}
      </button>
      {error && <span className="small">{error}</span>}
    </span>
  );
}
