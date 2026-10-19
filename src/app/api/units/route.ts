import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { newId, readStore, writeStore } from "@/lib/store";
import { cleanText } from "@/lib/validate";
import type { Unit } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user || user.role !== "landlord") {
    return NextResponse.json({ error: "Landlord sign-in required." }, { status: 403 });
  }
  const body = (await req.json().catch(() => null)) as
    | { label?: string; address?: string; monthlyRentDollars?: number }
    | null;
  const label = cleanText(body?.label, 80);
  const address = cleanText(body?.address, 300);
  const rent = Number(body?.monthlyRentDollars);
  if (!label || !address) {
    return NextResponse.json({ error: "Unit label and address are required." }, { status: 400 });
  }
  if (!Number.isFinite(rent) || rent < 0 || rent > 100000) {
    return NextResponse.json({ error: "Enter monthly rent between $0 and $100,000." }, { status: 400 });
  }
  const unit: Unit = {
    id: newId("unit"),
    label,
    address,
    monthlyRentCents: Math.round(rent * 100),
  };
  const store = await readStore();
  store.units.push(unit);
  await writeStore(store);
  return NextResponse.json({ unit }, { status: 201 });
}
