import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import { randomUUID } from "crypto";
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

function seed(): Store {
  return {
    users: [
      {
        id: "u_landlord",
        email: "landlord@demo.local",
        name: "Lee Landlord",
        role: "landlord",
        passwordHash: hashPassword("demo1234"),
        identityStatus: "verified",
      },
      {
        id: "u_tenant1",
        email: "tenant@demo.local",
        name: "Taylor Tenant",
        role: "tenant",
        unitId: "unit_4b",
        passwordHash: hashPassword("demo1234"),
        identityStatus: "not_started",
      },
      {
        id: "u_tenant2",
        email: "jamie@demo.local",
        name: "Jamie Renter",
        role: "tenant",
        unitId: "unit_2a",
        passwordHash: hashPassword("demo1234"),
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

export function readStore(): Store {
  const file = dataFile();
  if (!existsSync(file)) {
    const fresh = seed();
    writeStore(fresh);
    return fresh;
  }
  return JSON.parse(readFileSync(file, "utf8")) as Store;
}

export function writeStore(store: Store): void {
  const file = dataFile();
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(store, null, 2), "utf8");
}
