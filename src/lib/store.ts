import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { hashPassword } from "./password";
import type { Store } from "./types";

export function newId(prefix: string): string {
  return `${prefix}_${randomUUID().slice(0, 12)}`;
}

function dataFile(): string {
  return process.env.DATA_FILE || path.join(process.cwd(), "data", "store.json");
}

function inDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
function nowIso(): string {
  return new Date().toISOString();
}

async function seed(): Promise<Store> {
  const demoHash = await hashPassword("demo1234");
  return {
    users: [
      {
        id: "u_landlord",
        email: "landlord@demo.local",
        name: "Lee Landlord",
        role: "landlord",
        passwordHash: demoHash,
        identityStatus: "verified",
      },
      {
        id: "u_tenant1",
        email: "tenant@demo.local",
        name: "Taylor Tenant",
        role: "tenant",
        unitId: "unit_4b",
        passwordHash: demoHash,
        identityStatus: "not_started",
      },
      {
        id: "u_tenant2",
        email: "jamie@demo.local",
        name: "Jamie Renter",
        role: "tenant",
        unitId: "unit_2a",
        passwordHash: demoHash,
        identityStatus: "verified",
      },
    ],
    units: [
      { id: "unit_4b", label: "Unit 4B", address: "1200 Demo Ave, Unit 4B", monthlyRentCents: 165000 },
      { id: "unit_2a", label: "Unit 2A", address: "1200 Demo Ave, Unit 2A", monthlyRentCents: 145000 },
    ],
    dues: [
      {
        id: "due_current_4b",
        tenantId: "u_tenant1",
        unitId: "unit_4b",
        label: "Rent — current month",
        amountCents: 165000,
        dueDate: inDays(5),
        status: "unpaid",
      },
      {
        id: "due_current_2a",
        tenantId: "u_tenant2",
        unitId: "unit_2a",
        label: "Rent — current month",
        amountCents: 145000,
        dueDate: inDays(5),
        status: "unpaid",
      },
    ],
    payments: [],
    verifications: [
      {
        id: "ver_jamie",
        tenantId: "u_tenant2",
        provider: "manual",
        status: "verified",
        documentType: "driver_license",
        documentName: "license-front.jpg",
        createdAt: nowIso(),
        reviewedAt: nowIso(),
      },
    ],
    maintenance: [
      {
        id: "maint_seed_open",
        tenantId: "u_tenant2",
        unitId: "unit_2a",
        title: "Kitchen faucet drips",
        description: "Steady drip under the sink. Bucket underneath for now.",
        category: "plumbing",
        priority: "normal",
        status: "open",
        archived: false,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      },
      {
        id: "maint_seed_archived",
        tenantId: "u_tenant1",
        unitId: "unit_4b",
        title: "Replace hallway bulb",
        description: "Done during move-in walkthrough.",
        category: "electrical",
        priority: "low",
        status: "resolved",
        archived: true,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      },
    ],
  };
}

// Storage backends, in order: Cloudflare D1 (Workers), local JSON file (Node dev),
// then in-memory (last-resort so a misconfigured deploy still renders demo data).
// The whole store is one JSON blob — adequate for a single-landlord MVP, not for
// concurrent writers at scale.
interface D1Statement {
  bind(...values: unknown[]): D1Statement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  run(): Promise<unknown>;
}
interface D1Like {
  prepare(query: string): D1Statement;
}

async function getD1(): Promise<D1Like | null> {
  try {
    const getContext = getCloudflareContext as unknown as (options: {
      async: true;
    }) => Promise<{ env: Record<string, unknown> }>;
    const ctx = await getContext({ async: true });
    const db = ctx.env.DB as D1Like | undefined;
    return db ?? null;
  } catch {
    return null;
  }
}

async function ensureTable(db: D1Like): Promise<void> {
  await db
    .prepare("CREATE TABLE IF NOT EXISTS app_store (k TEXT PRIMARY KEY, v TEXT NOT NULL)")
    .run();
}

let memoryStore: Store | null = null;

export async function readStore(): Promise<Store> {
  const db = await getD1();
  if (db) {
    await ensureTable(db);
    const row = await db
      .prepare("SELECT v FROM app_store WHERE k = ?")
      .bind("main")
      .first<{ v: string }>();
    if (row?.v) return JSON.parse(row.v) as Store;
    const fresh = await seed();
    await writeStore(fresh);
    return fresh;
  }
  try {
    const file = dataFile();
    if (!existsSync(file)) {
      const fresh = await seed();
      await writeStore(fresh);
      return fresh;
    }
    return JSON.parse(readFileSync(file, "utf8")) as Store;
  } catch {
    if (!memoryStore) memoryStore = await seed();
    return memoryStore;
  }
}

export async function writeStore(store: Store): Promise<void> {
  const db = await getD1();
  if (db) {
    await ensureTable(db);
    await db
      .prepare("INSERT OR REPLACE INTO app_store (k, v) VALUES (?, ?)")
      .bind("main", JSON.stringify(store))
      .run();
    return;
  }
  try {
    const file = dataFile();
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, JSON.stringify(store, null, 2), "utf8");
  } catch {
    memoryStore = store;
  }
}
