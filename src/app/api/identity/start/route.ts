import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { newId, readStore, writeStore } from "@/lib/store";
import { appUrl, getStripe } from "@/lib/stripe";
import type { Verification } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const user = getUserFromRequest(req);
  if (!user || user.role !== "tenant") {
    return NextResponse.json({ error: "Tenant sign-in required." }, { status: 403 });
  }
  const body = (await req.json().catch(() => null)) as
    | { documentType?: string; documentName?: string }
    | null;
  const store = readStore();
  const tenant = store.users.find((u) => u.id === user.id);
  if (!tenant) return NextResponse.json({ error: "Account not found." }, { status: 404 });

  const stripe = getStripe();
  if (stripe) {
    try {
      const create = stripe.identity.verificationSessions.create.bind(
        stripe.identity.verificationSessions
      ) as (params: Record<string, unknown>) => Promise<{
        id: string;
        url: string | null;
        status: string;
      }>;
      const session = await create({
        provided_details: { email: user.email },
        metadata: { tenantId: user.id },
        return_url: `${appUrl()}/tenant/identity/return`,
      });
      const verification: Verification = {
        id: newId("ver"),
        tenantId: user.id,
        provider: "stripe",
        status: "requires_input",
        stripeId: session.id,
        url: session.url || undefined,
        createdAt: new Date().toISOString(),
      };
      store.verifications.push(verification);
      tenant.identityStatus = "requires_input";
      writeStore(store);
      return NextResponse.json(
        { url: session.url, manual: false, verification },
        { status: 201 }
      );
    } catch {
      // Fall through to manual review if Identity is not enabled on the account.
    }
  }

  const documentType = body?.documentType?.trim().slice(0, 60) || "";
  const documentName = body?.documentName?.trim().slice(0, 200) || "";
  if (!documentType || !documentName) {
    return NextResponse.json(
      { error: "Choose a document type and enter the file name you would upload." },
      { status: 400 }
    );
  }
  const verification: Verification = {
    id: newId("ver"),
    tenantId: user.id,
    provider: "manual",
    status: "pending_review",
    documentType,
    documentName,
    createdAt: new Date().toISOString(),
  };
  store.verifications.push(verification);
  tenant.identityStatus = "pending_review";
  writeStore(store);
  return NextResponse.json({ manual: true, verification }, { status: 201 });
}
