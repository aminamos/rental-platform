import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { formatDate, formatMoney } from "@/lib/format";
import { readStore } from "@/lib/store";
import { stripeConfigured } from "@/lib/stripe";
import { badgeClass, pretty } from "@/components/status";
import {
  AddDueForm,
  AddTenantForm,
  AddUnitForm,
  MaintenanceControls,
  ReviewButtons,
} from "./DashboardActions";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "landlord") redirect("/tenant");

  const store = await readStore();
  const tenantName = (id: string) => store.users.find((u) => u.id === id)?.name || id;
  const unitLabel = (id: string) => store.units.find((u) => u.id === id)?.label || id;
  const tenants = store.users.filter((u) => u.role === "tenant");
  const unpaidTotal = store.dues
    .filter((d) => d.status === "unpaid")
    .reduce((sum, d) => sum + d.amountCents, 0);
  const collected = store.payments
    .filter((p) => p.status === "succeeded")
    .reduce((sum, p) => sum + p.amountCents, 0);
  const openMaintenance = store.maintenance.filter((m) => !m.archived && m.status !== "resolved");
  const pendingVerifications = store.verifications.filter(
    (v) => v.status === "pending_review" || v.status === "requires_input"
  );
  const active = store.maintenance.filter((m) => !m.archived);
  const archived = store.maintenance.filter((m) => m.archived);

  return (
    <>
      <h1>Landlord dashboard</h1>
      <p className="muted">
        {stripeConfigured()
          ? "Stripe is configured (payments and identity use your Stripe test keys)."
          : "Stripe keys are not configured, so test checkout (no card is charged) and manual identity review are active. Add Stripe keys as environment secrets before collecting real rent."}
      </p>
      <div className="stat-rows">
        <div className="stat"><span className="value">{formatMoney(unpaidTotal)}</span><span className="label">Outstanding rent</span></div>
        <div className="stat"><span className="value">{formatMoney(collected)}</span><span className="label">Collected</span></div>
        <div className="stat"><span className="value">{openMaintenance.length}</span><span className="label">Open maintenance</span></div>
        <div className="stat"><span className="value">{pendingVerifications.length}</span><span className="label">Identity checks waiting</span></div>
      </div>

      <h2>Units and tenants</h2>
      <div className="panel">
        <table>
          <thead><tr><th>Unit</th><th>Address</th><th>Monthly rent</th><th>Tenant</th><th>Identity</th></tr></thead>
          <tbody>
            {store.units.map((unit) => {
              const tenant = tenants.find((t) => t.unitId === unit.id);
              return (
                <tr key={unit.id}>
                  <td>{unit.label}</td>
                  <td>{unit.address}</td>
                  <td>{formatMoney(unit.monthlyRentCents)}</td>
                  <td>{tenant ? <>{tenant.name}<br /><span className="small muted">{tenant.email}</span></> : <span className="muted">Vacant</span>}</td>
                  <td>{tenant ? <span className={badgeClass(tenant.identityStatus)}>{pretty(tenant.identityStatus)}</span> : "—"}</td>
                </tr>
              );
            })}
            {store.units.length === 0 && <tr><td colSpan={5} className="muted">No units yet. Add your first unit below.</td></tr>}
          </tbody>
        </table>
        <h3>Add a unit</h3>
        <AddUnitForm />
        <h3>Create a tenant account</h3>
        <AddTenantForm units={store.units.map((u) => ({ id: u.id, label: u.label }))} />
      </div>

      <h2>Charges</h2>
      <div className="panel">
        <table>
          <thead><tr><th>Tenant</th><th>Charge</th><th>Amount</th><th>Due</th><th>Status</th></tr></thead>
          <tbody>
            {store.dues.map((d) => (
              <tr key={d.id}>
                <td>{tenantName(d.tenantId)}<br /><span className="small muted">{unitLabel(d.unitId)}</span></td>
                <td>{d.label}</td>
                <td>{formatMoney(d.amountCents)}</td>
                <td>{formatDate(d.dueDate)}</td>
                <td><span className={badgeClass(d.status)}>{pretty(d.status)}</span></td>
              </tr>
            ))}
            {store.dues.length === 0 && <tr><td colSpan={5} className="muted">No charges yet.</td></tr>}
          </tbody>
        </table>
        <h3>Add a charge</h3>
        {tenants.length === 0 ? (
          <p className="muted">Create a tenant account above before adding charges.</p>
        ) : (
          <AddDueForm tenants={tenants.map((t) => ({ id: t.id, name: t.name, unitLabel: unitLabel(t.unitId || "") }))} />
        )}
      </div>

      <h2>Payments</h2>
      <div className="panel">
        <table>
          <thead><tr><th>Tenant</th><th>Amount</th><th>Method</th><th>Status</th><th>Date</th></tr></thead>
          <tbody>
            {[...store.payments].reverse().map((p) => (
              <tr key={p.id}>
                <td>{tenantName(p.tenantId)}</td>
                <td>{formatMoney(p.amountCents)}</td>
                <td>{p.mode === "stripe" ? "Stripe" : "Test checkout"}</td>
                <td><span className={badgeClass(p.status)}>{pretty(p.status)}</span></td>
                <td>{formatDate(p.paidAt || p.createdAt)}</td>
              </tr>
            ))}
            {store.payments.length === 0 && <tr><td colSpan={5} className="muted">No payments yet.</td></tr>}
          </tbody>
        </table>
      </div>
      <h2>Identity verifications</h2>
      <div className="panel">
        <table>
          <thead><tr><th>Tenant</th><th>Provider</th><th>Document</th><th>Status</th><th>Submitted</th><th>Review</th></tr></thead>
          <tbody>
            {[...store.verifications].reverse().map((v) => (
              <tr key={v.id}>
                <td>{tenantName(v.tenantId)}</td>
                <td>{v.provider}</td>
                <td>{v.documentName || v.stripeId || "—"}{v.documentType ? <><br /><span className="small muted">{pretty(v.documentType)}</span></> : null}</td>
                <td><span className={badgeClass(v.status)}>{pretty(v.status)}</span></td>
                <td>{formatDate(v.createdAt)}</td>
                <td>
                  {(v.status === "pending_review" || v.status === "requires_input") ? (
                    <ReviewButtons verificationId={v.id} />
                  ) : (
                    <span className="small muted">Done</span>
                  )}
                </td>
              </tr>
            ))}
            {store.verifications.length === 0 && <tr><td colSpan={6} className="muted">No verifications yet.</td></tr>}
          </tbody>
        </table>
      </div>

      <h2>Maintenance inbox</h2>
      <div className="panel">
        <table>
          <thead><tr><th>Request</th><th>Tenant</th><th>Priority</th><th>Status</th><th>Controls</th></tr></thead>
          <tbody>
            {active.map((m) => (
              <tr key={m.id}>
                <td><strong>{m.title}</strong><br /><span className="small muted">{pretty(m.category)} · {formatDate(m.createdAt)}</span><br />{m.description}</td>
                <td>{tenantName(m.tenantId)}<br /><span className="small muted">{unitLabel(m.unitId)}</span></td>
                <td>{m.priority}</td>
                <td><span className={badgeClass(m.status)}>{pretty(m.status)}</span></td>
                <td><MaintenanceControls id={m.id} status={m.status} archived={m.archived} /></td>
              </tr>
            ))}
            {active.length === 0 && <tr><td colSpan={5} className="muted">Inbox is clear.</td></tr>}
          </tbody>
        </table>
      </div>

      <h2>Archived maintenance</h2>
      <div className="panel">
        <table>
          <thead><tr><th>Request</th><th>Tenant</th><th>Status</th><th>Controls</th></tr></thead>
          <tbody>
            {archived.map((m) => (
              <tr key={m.id}>
                <td><strong>{m.title}</strong><br /><span className="small muted">{pretty(m.category)} · {formatDate(m.createdAt)}</span></td>
                <td>{tenantName(m.tenantId)}</td>
                <td><span className={badgeClass(m.status)}>{pretty(m.status)}</span></td>
                <td><MaintenanceControls id={m.id} status={m.status} archived={m.archived} /></td>
              </tr>
            ))}
            {archived.length === 0 && <tr><td colSpan={4} className="muted">Nothing archived yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
