import { NextResponse } from "next/server";
import { markPaymentSucceeded, markStripeSessionPaid } from "@/lib/payments";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret || secret.includes("replace_me")) {
    return NextResponse.json({ error: "Webhook is not configured." }, { status: 400 });
  }
  const signature = req.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Missing signature." }, { status: 400 });
  const raw = await req.text();
  let event;
  try {
    event = stripe.webhooks.constructEvent(raw, signature, secret);
  } catch {
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    if (session.payment_status === "paid") {
      const bySession = markStripeSessionPaid(session.id);
      const paymentId = session.metadata?.paymentId;
      if (!bySession && paymentId) markPaymentSucceeded(paymentId);
    }
  }
  return NextResponse.json({ received: true });
}
