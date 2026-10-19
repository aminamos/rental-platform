import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { Store } from "./types";

export function newId(prefix: string): string {
  return `${prefix}_${randomUUID().slice(0, 12)}`;
}

function dataFile(): string {
  return process.env.DATA_FILE || path.join(process.cwd(), "data", "store.json");
}

// A fresh install starts completely empty. The first landlord account is
// created through /setup; units and tenant accounts are created from the
// landlord dashboard. Nothing is pre-created here.
export function emptyStore(): Store {
  return {
    users: [],
    units: [],
    dues: [],
    payments: [],
    verifications: [],
    maintenance: [],
  };
}

// Storage backends, in order: Cloudflare D1 (Workers), local JSON file (Node dev),
// then in-memory (last-resort so a misconfigured deploy still renders).
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
    const fresh = emptyStore();
    await writeStore(fresh);
    return fresh;
  }
  try {
    const file = dataFile();
    if (!existsSync(file)) {
      const fresh = emptyStore();
      await writeStore(fresh);
      return fresh;
    }
    return JSON.parse(readFileSync(file, "utf8")) as Store;
  } catch {
    if (!memoryStore) memoryStore = emptyStore();
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
