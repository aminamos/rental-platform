import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { markStripeSessionPaid } from "@/lib/payments";
import { getStripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";

export default async function PaySuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { session_id } = await searchParams;
  let confirmed = false;
  const stripe = getStripe();
  if (stripe && session_id) {
    try {
      const session = await stripe.checkout.sessions.retrieve(session_id);
      if (session.payment_status === "paid") {
        confirmed = markStripeSessionPaid(session.id);
      }
    } catch {
      confirmed = false;
    }
  }
  return (
    <div style={{ maxWidth: 560 }}>
      <h1>{confirmed ? "Payment received" : "Payment processing"}</h1>
      <div className={confirmed ? "notice" : "panel"}>
        <p>
          {confirmed
            ? "Stripe confirmed your test payment and the charge is now marked paid."
            : "We could not confirm this session yet. The Stripe webhook will reconcile it, or check your tenant home for the latest status."}
        </p>
        <p><Link className="btn" href="/tenant">Back to tenant home</Link></p>
      </div>
    </div>
  );
}
