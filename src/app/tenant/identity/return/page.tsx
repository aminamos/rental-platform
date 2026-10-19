import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { readStore, writeStore } from "@/lib/store";
import { getStripe } from "@/lib/stripe";
import { badgeClass, pretty } from "@/components/status";
import type { IdentityStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

function mapStatus(raw: string): IdentityStatus {
  if (raw === "verified") return "verified";
  if (raw === "processing") return "processing";
  if (raw === "requires_input") return "requires_input";
  return "pending_review";
}

export default async function IdentityReturnPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const store = await readStore();
  const latest = [...store.verifications]
    .reverse()
    .find((v) => v.tenantId === user.id && v.provider === "stripe" && v.stripeId);
  let status: IdentityStatus = user.identityStatus;
  const stripe = getStripe();
  if (stripe && latest?.stripeId) {
    try {
      const retrieve = stripe.identity.verificationSessions.retrieve.bind(
        stripe.identity.verificationSessions
      ) as (id: string) => Promise<{ status: string }>;
      const session = await retrieve(latest.stripeId);
      status = mapStatus(session.status);
      latest.status = status;
      const tenant = store.users.find((u) => u.id === user.id);
      if (tenant) tenant.identityStatus = status;
      await writeStore(store);
    } catch {
      // Keep the stored status if Stripe cannot be reached right now.
    }
  }
  return (
    <div style={{ maxWidth: 560 }}>
      <h1>Identity verification</h1>
      <div className="panel">
        <p>
          Current status: <span className={badgeClass(status)}>{pretty(status)}</span>
        </p>
        <p className="muted">
          Stripe may take a moment to finish processing. Your tenant home always shows the latest
          saved status, and your landlord can also review it from the dashboard.
        </p>
        <p><Link className="btn" href="/tenant">Back to tenant home</Link></p>
      </div>
    </div>
  );
}
