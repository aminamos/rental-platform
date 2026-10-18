import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { readStore, writeStore } from "@/lib/store";
import type { MaintenanceStatus } from "@/lib/types";

export const runtime = "nodejs";

const STATUSES: MaintenanceStatus[] = ["open", "in_progress", "resolved"];

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const { id } = await params;
  const body = (await req.json().catch(() => null)) as
    | { status?: string; archived?: boolean }
    | null;
  const store = readStore();
  const item = store.maintenance.find((m) => m.id === id);
  if (!item) return NextResponse.json({ error: "Request not found." }, { status: 404 });

  if (user.role === "landlord") {
    if (body?.status !== undefined) {
      if (!STATUSES.includes(body.status as MaintenanceStatus)) {
        return NextResponse.json({ error: "Invalid status." }, { status: 400 });
      }
      item.status = body.status as MaintenanceStatus;
    }
    if (typeof body?.archived === "boolean") item.archived = body.archived;
  } else {
    // Tenants may archive or restore only their own resolved requests.
    if (item.tenantId !== user.id) {
      return NextResponse.json({ error: "Not your request." }, { status: 403 });
    }
    if (typeof body?.archived === "boolean") {
      if (body.archived && item.status !== "resolved") {
        return NextResponse.json(
          { error: "Only resolved requests can be archived." },
          { status: 400 }
        );
      }
      item.archived = body.archived;
    } else {
      return NextResponse.json({ error: "Tenants can only archive requests." }, { status: 403 });
    }
  }
  item.updatedAt = new Date().toISOString();
  writeStore(store);
  return NextResponse.json({ maintenance: item });
}
