import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { newId, readStore, writeStore } from "@/lib/store";
import { appUrl, getStripe } from "@/lib/stripe";
import type { Payment } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user || user.role !== "tenant") {
    return NextResponse.json({ error: "Tenant sign-in required." }, { status: 403 });
  }
  const body = (await req.json().catch(() => null)) as { dueId?: string } | null;
  const store = await readStore();
  const due = store.dues.find((d) => d.id === body?.dueId && d.tenantId === user.id);
  if (!due) return NextResponse.json({ error: "Charge not found." }, { status: 404 });
  if (due.status === "paid") {
    return NextResponse.json({ error: "This charge is already paid." }, { status: 400 });
  }

  const payment: Payment = {
    id: newId("pay"),
    dueId: due.id,
    tenantId: user.id,
    amountCents: due.amountCents,
    status: "pending",
    mode: "mock",
    createdAt: new Date().toISOString(),
  };

  const stripe = getStripe();
  if (stripe) {
    try {
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        customer_email: user.email,
        client_reference_id: payment.id,
        metadata: { paymentId: payment.id, dueId: due.id, tenantId: user.id },
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: "usd",
              unit_amount: due.amountCents,
              product_data: { name: due.label },
            },
          },
        ],
        success_url: `${appUrl()}/tenant/pay/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${appUrl()}/tenant?payment=canceled`,
      });
      payment.mode = "stripe";
      payment.stripeSessionId = session.id;
      store.payments.push(payment);
      await writeStore(store);
      return NextResponse.json({ url: session.url, mock: false, paymentId: payment.id });
    } catch {
      return NextResponse.json(
        { error: "Stripe Checkout could not be started. Check your test-mode keys." },
        { status: 502 }
      );
    }
  }

  // No Stripe key configured: test checkout so the flow stays testable without moving money.
  store.payments.push(payment);
  await writeStore(store);
  return NextResponse.json({
    url: `/tenant/pay/mock?paymentId=${payment.id}`,
    mock: true,
    paymentId: payment.id,
  });
}
