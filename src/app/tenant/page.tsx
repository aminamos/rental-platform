import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { formatDate, formatMoney } from "@/lib/format";
import { readStore } from "@/lib/store";
import { badgeClass, pretty } from "@/components/status";
import { ArchiveButton, IdentityForm, MaintenanceForm, PayButton } from "./TenantActions";

export const dynamic = "force-dynamic";

export default async function TenantPage({
  searchParams,
}: {
  searchParams: Promise<{ payment?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "tenant") redirect("/dashboard");
  const { payment } = await searchParams;

  const store = await readStore();
  const unit = store.units.find((u) => u.id === user.unitId);
  const dues = store.dues.filter((d) => d.tenantId === user.id);
  const payments = [...store.payments.filter((p) => p.tenantId === user.id)].reverse();
  const mine = store.maintenance.filter((m) => m.tenantId === user.id);
  const active = mine.filter((m) => !m.archived);
  const archived = mine.filter((m) => m.archived);
  const balance = dues
    .filter((d) => d.status === "unpaid")
    .reduce((sum, d) => sum + d.amountCents, 0);

  return (
    <>
      <h1>Welcome, {user.name}</h1>
      <p className="muted">
        {unit ? `${unit.label} — ${unit.address}` : "No unit linked yet."} · Identity:{" "}
        <span className={badgeClass(user.identityStatus)}>{pretty(user.identityStatus)}</span>
      </p>
      {payment === "canceled" && (
        <div className="error">Checkout was canceled. Your charge is still unpaid below.</div>
      )}

      <div className="stat-rows">
        <div className="stat"><span className="value">{formatMoney(balance)}</span><span className="label">Balance due</span></div>
        <div className="stat"><span className="value">{active.length}</span><span className="label">Active maintenance</span></div>
        <div className="stat"><span className="value">{archived.length}</span><span className="label">Archived requests</span></div>
      </div>

      <h2>Rent and charges</h2>
      <div className="panel">
        <table>
          <thead><tr><th>Charge</th><th>Amount</th><th>Due</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {dues.map((d) => (
              <tr key={d.id}>
                <td>{d.label}</td>
                <td>{formatMoney(d.amountCents)}</td>
                <td>{formatDate(d.dueDate)}</td>
                <td><span className={badgeClass(d.status)}>{pretty(d.status)}</span></td>
                <td>{d.status === "unpaid" && <PayButton dueId={d.id} />}</td>
              </tr>
            ))}
            {dues.length === 0 && <tr><td colSpan={5} className="muted">No charges yet.</td></tr>}
          </tbody>
        </table>
        {payments.length > 0 && (
          <>
            <h3>Payment history</h3>
            <table>
              <thead><tr><th>Amount</th><th>Method</th><th>Status</th><th>Date</th></tr></thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td>{formatMoney(p.amountCents)}</td>
                    <td>{p.mode === "stripe" ? "Stripe" : "Test checkout"}</td>
                    <td><span className={badgeClass(p.status)}>{pretty(p.status)}</span></td>
                    <td>{formatDate(p.paidAt || p.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
      <h2>Verify your identity</h2>
      <div className="panel">
        <p>
          Current status:{" "}
          <span className={badgeClass(user.identityStatus)}>{pretty(user.identityStatus)}</span>
        </p>
        {user.identityStatus === "verified" ? (
          <p className="muted">Your identity is verified. No further action is needed.</p>
        ) : (
          <IdentityForm />
        )}
      </div>

      <h2>Maintenance</h2>
      <div className="panel">
        <h3>Request maintenance</h3>
        <MaintenanceForm />
      </div>
      <div className="panel">
        <h3>Your requests</h3>
        <table>
          <thead><tr><th>Request</th><th>Priority</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {active.map((m) => (
              <tr key={m.id}>
                <td><strong>{m.title}</strong><br /><span className="small muted">{pretty(m.category)} · {formatDate(m.createdAt)}</span><br />{m.description}</td>
                <td>{m.priority}</td>
                <td><span className={badgeClass(m.status)}>{pretty(m.status)}</span></td>
                <td>{m.status === "resolved" && <ArchiveButton id={m.id} archived={m.archived} />}</td>
              </tr>
            ))}
            {active.length === 0 && <tr><td colSpan={4} className="muted">No active requests.</td></tr>}
          </tbody>
        </table>
        {archived.length > 0 && (
          <>
            <h3>Archived</h3>
            <table>
              <thead><tr><th>Request</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {archived.map((m) => (
                  <tr key={m.id}>
                    <td><strong>{m.title}</strong><br /><span className="small muted">{formatDate(m.createdAt)}</span></td>
                    <td><span className={badgeClass(m.status)}>{pretty(m.status)}</span></td>
                    <td><ArchiveButton id={m.id} archived={m.archived} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
    </>
  );
}
