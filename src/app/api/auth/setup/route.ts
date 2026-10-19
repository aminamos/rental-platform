import { NextResponse } from "next/server";
import { SESSION_COOKIE, createSessionToken, publicUser, sessionCookieOptions } from "@/lib/auth";
import { hashPassword } from "@/lib/password";
import { newId, readStore, writeStore } from "@/lib/store";
import { MIN_PASSWORD_LENGTH, cleanEmail, cleanText, isValidEmail } from "@/lib/validate";
import type { User } from "@/lib/types";

export const runtime = "nodejs";

// First-run setup: creates the landlord account. Disabled once a landlord exists.
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as
    | { name?: string; email?: string; password?: string }
    | null;
  const name = cleanText(body?.name, 120);
  const email = cleanEmail(body?.email);
  const password = typeof body?.password === "string" ? body.password : "";
  if (!name || !isValidEmail(email)) {
    return NextResponse.json({ error: "Enter your name and a valid email." }, { status: 400 });
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return NextResponse.json(
      { error: `Use a password of at least ${MIN_PASSWORD_LENGTH} characters.` },
      { status: 400 }
    );
  }
  const store = await readStore();
  if (store.users.some((u) => u.role === "landlord")) {
    return NextResponse.json(
      { error: "Setup is already complete. Sign in instead." },
      { status: 409 }
    );
  }
  if (store.users.some((u) => u.email.toLowerCase() === email)) {
    return NextResponse.json({ error: "That email is already in use." }, { status: 409 });
  }
  const user: User = {
    id: newId("u"),
    email,
    name,
    role: "landlord",
    passwordHash: await hashPassword(password),
    identityStatus: "verified",
  };
  store.users.push(user);
  await writeStore(store);
  const res = NextResponse.json({ user: publicUser(user) }, { status: 201 });
  res.cookies.set(SESSION_COOKIE, createSessionToken(user.id), sessionCookieOptions());
  return res;
}
