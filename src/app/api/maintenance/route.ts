import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { newId, readStore, writeStore } from "@/lib/store";

export const runtime = "nodejs";

const CATEGORIES = ["plumbing", "electrical", "appliance", "heating_cooling", "other"];
const PRIORITIES = ["low", "normal", "high", "urgent"] as const;

export async function GET(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const archived = new URL(req.url).searchParams.get("archived");
  const store = await readStore();
  let items =
    user.role === "landlord"
      ? store.maintenance
      : store.maintenance.filter((m) => m.tenantId === user.id);
  if (archived === "true") items = items.filter((m) => m.archived);
  if (archived === "false") items = items.filter((m) => !m.archived);
  items = [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return NextResponse.json({ maintenance: items });
}

export async function POST(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user || user.role !== "tenant") {
    return NextResponse.json({ error: "Tenant sign-in required." }, { status: 403 });
  }
  if (!user.unitId) {
    return NextResponse.json({ error: "Your account is not linked to a unit." }, { status: 400 });
  }
  const body = (await req.json().catch(() => null)) as
    | { title?: string; description?: string; category?: string; priority?: string }
    | null;
  const title = body?.title?.trim().slice(0, 140) || "";
  const description = body?.description?.trim().slice(0, 4000) || "";
  if (!title || !description) {
    return NextResponse.json({ error: "Title and description are required." }, { status: 400 });
  }
  const category = CATEGORIES.includes(body?.category || "") ? (body?.category as string) : "other";
  const priority = (PRIORITIES as readonly string[]).includes(body?.priority || "")
    ? (body?.priority as (typeof PRIORITIES)[number])
    : "normal";
  const now = new Date().toISOString();
  const item = {
    id: newId("maint"),
    tenantId: user.id,
    unitId: user.unitId,
    title,
    description,
    category,
    priority,
    status: "open" as const,
    archived: false,
    createdAt: now,
    updatedAt: now,
  };
  const store = await readStore();
  store.maintenance.push(item);
  await writeStore(store);
  return NextResponse.json({ maintenance: item }, { status: 201 });
}
