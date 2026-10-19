import { NextResponse } from "next/server";
import { getUserFromRequest, publicUser } from "@/lib/auth";
import { hashPassword } from "@/lib/password";
import { newId, readStore, writeStore } from "@/lib/store";
import { MIN_PASSWORD_LENGTH, cleanEmail, cleanText, isValidEmail } from "@/lib/validate";
import type { User } from "@/lib/types";

export const runtime = "nodejs";

// Landlord creates a tenant account and shares the temporary password with them.
export async function POST(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user || user.role !== "landlord") {
    return NextResponse.json({ error: "Landlord sign-in required." }, { status: 403 });
  }
  const body = (await req.json().catch(() => null)) as
    | { name?: string; email?: string; password?: string; unitId?: string }
    | null;
  const name = cleanText(body?.name, 120);
  const email = cleanEmail(body?.email);
  const password = typeof body?.password === "string" ? body.password : "";
  if (!name || !isValidEmail(email)) {
    return NextResponse.json({ error: "Enter the tenant name and a valid email." }, { status: 400 });
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return NextResponse.json(
      { error: `Use a temporary password of at least ${MIN_PASSWORD_LENGTH} characters.` },
      { status: 400 }
    );
  }
  const store = await readStore();
  const unit = store.units.find((u) => u.id === body?.unitId);
  if (!unit) return NextResponse.json({ error: "Choose a valid unit." }, { status: 400 });
  if (store.users.some((u) => u.email.toLowerCase() === email)) {
    return NextResponse.json({ error: "That email is already in use." }, { status: 409 });
  }
  const tenant: User = {
    id: newId("u"),
    email,
    name,
    role: "tenant",
    unitId: unit.id,
    passwordHash: await hashPassword(password),
    identityStatus: "not_started",
  };
  store.users.push(tenant);
  await writeStore(store);
  return NextResponse.json({ user: publicUser(tenant) }, { status: 201 });
}
