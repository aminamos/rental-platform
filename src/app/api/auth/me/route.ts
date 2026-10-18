import { NextResponse } from "next/server";
import { getUserFromRequest, publicUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  return NextResponse.json({ user: publicUser(user) });
}
