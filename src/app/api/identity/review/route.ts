import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { readStore, writeStore } from "@/lib/store";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user || user.role !== "landlord") {
    return NextResponse.json({ error: "Landlord sign-in required." }, { status: 403 });
  }
  const body = (await req.json().catch(() => null)) as
    | { verificationId?: string; decision?: string }
    | null;
  if (body?.decision !== "approve" && body?.decision !== "reject") {
    return NextResponse.json({ error: "Decision must be approve or reject." }, { status: 400 });
  }
  const store = await readStore();
  const verification = store.verifications.find((v) => v.id === body?.verificationId);
  if (!verification) {
    return NextResponse.json({ error: "Verification not found." }, { status: 404 });
  }
  verification.status = body.decision === "approve" ? "verified" : "rejected";
  verification.reviewedAt = new Date().toISOString();
  const tenant = store.users.find((u) => u.id === verification.tenantId);
  if (tenant) tenant.identityStatus = verification.status;
  await writeStore(store);
  return NextResponse.json({ verification });
}
