import { readStore, writeStore } from "./store";

/** Mark a payment succeeded and its due paid. Returns false if not found. */
export async function markPaymentSucceeded(paymentId: string): Promise<boolean> {
  const store = await readStore();
  const payment = store.payments.find((p) => p.id === paymentId);
  if (!payment) return false;
  payment.status = "succeeded";
  payment.paidAt = new Date().toISOString();
  const due = store.dues.find((d) => d.id === payment.dueId);
  if (due) due.status = "paid";
  await writeStore(store);
  return true;
}

export async function markStripeSessionPaid(sessionId: string): Promise<boolean> {
  const store = await readStore();
  const payment = store.payments.find((p) => p.stripeSessionId === sessionId);
  if (!payment) return false;
  payment.status = "succeeded";
  payment.paidAt = new Date().toISOString();
  const due = store.dues.find((d) => d.id === payment.dueId);
  if (due) due.status = "paid";
  await writeStore(store);
  return true;
}
