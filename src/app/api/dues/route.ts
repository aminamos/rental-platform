import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { newId, readStore, writeStore } from "@/lib/store";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const store = await readStore();
  const dues =
    user.role === "landlord" ? store.dues : store.dues.filter((d) => d.tenantId === user.id);
  return NextResponse.json({ dues });
}

export async function POST(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user || user.role !== "landlord") {
    return NextResponse.json({ error: "Landlord sign-in required." }, { status: 403 });
  }
  const body = (await req.json().catch(() => null)) as
    | { tenantId?: string; label?: string; amountDollars?: number; dueDate?: string }
    | null;
  const store = await readStore();
  const tenant = store.users.find((u) => u.id === body?.tenantId && u.role === "tenant");
  const amount = Number(body?.amountDollars);
  if (!tenant || !tenant.unitId) {
    return NextResponse.json({ error: "Choose a valid tenant." }, { status: 400 });
  }
  if (!Number.isFinite(amount) || amount <= 0 || amount > 100000) {
    return NextResponse.json({ error: "Enter an amount between $0 and $100,000." }, { status: 400 });
  }
  const due = {
    id: newId("due"),
    tenantId: tenant.id,
    unitId: tenant.unitId,
    label: body?.label?.trim().slice(0, 120) || "Rent",
    amountCents: Math.round(amount * 100),
    dueDate: body?.dueDate || new Date().toISOString().slice(0, 10),
    status: "unpaid" as const,
  };
  store.dues.push(due);
  await writeStore(store);
  return NextResponse.json({ due }, { status: 201 });
}
