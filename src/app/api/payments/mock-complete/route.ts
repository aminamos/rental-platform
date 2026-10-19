import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { markPaymentSucceeded } from "@/lib/payments";
import { readStore } from "@/lib/store";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user || user.role !== "tenant") {
    return NextResponse.json({ error: "Tenant sign-in required." }, { status: 403 });
  }
  const body = (await req.json().catch(() => null)) as { paymentId?: string } | null;
  const payment = (await readStore()).payments.find(
    (p) => p.id === body?.paymentId && p.tenantId === user.id
  );
  if (!payment) return NextResponse.json({ error: "Payment not found." }, { status: 404 });
  if (payment.mode !== "mock") {
    return NextResponse.json({ error: "This payment must finish in Stripe Checkout." }, { status: 400 });
  }
  await markPaymentSucceeded(payment.id);
  return NextResponse.json({ ok: true });
}
