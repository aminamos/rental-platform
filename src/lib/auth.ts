import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { readStore } from "./store";
import type { User } from "./types";

export const SESSION_COOKIE = "rp_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

function secret(): string {
  return process.env.SESSION_SECRET || "dev-only-change-me-in-production";
}
function sign(value: string): string {
  return createHmac("sha256", secret()).update(value).digest("base64url");
}

export function createSessionToken(userId: string): string {
  const payload = Buffer.from(
    JSON.stringify({ userId, exp: Date.now() + MAX_AGE_SECONDS * 1000 })
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function verifySessionToken(token: string | undefined): string | null {
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = sign(payload);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      userId: string;
      exp: number;
    };
    if (!data.userId || data.exp < Date.now()) return null;
    return data.userId;
  } catch {
    return null;
  }
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: MAX_AGE_SECONDS,
    // Secure cookies are dropped over plain http (e.g. localhost). Only require
    // https when the configured app URL is https.
    secure: (process.env.NEXT_PUBLIC_APP_URL || "").startsWith("https://"),
  };
}

export function publicUser(user: User) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    unitId: user.unitId,
    identityStatus: user.identityStatus,
  };
}

export async function userById(userId: string | null): Promise<User | null> {
  if (!userId) return null;
  const store = await readStore();
  return store.users.find((u) => u.id === userId) || null;
}

export async function getCurrentUser(): Promise<User | null> {
  const store = await cookies();
  return userById(verifySessionToken(store.get(SESSION_COOKIE)?.value));
}

export async function getUserFromRequest(req: Request): Promise<User | null> {
  const header = req.headers.get("cookie") || "";
  const match = header.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]+)`));
  const token = match ? decodeURIComponent(match[1]) : undefined;
  return userById(verifySessionToken(token));
}
