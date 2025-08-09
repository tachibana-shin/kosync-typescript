import { assert } from "@std/assert"
import { KvBase } from "../base.ts"
import postgres, { Sql } from "npm:postgres"

export class PostgresKv extends KvBase {
  private sql?: Sql

  constructor(
    private readonly config: {
      user: string
      password?: string
      database: string
      hostname: string
      port: number
    }
  ) {
    super()
  }

  override async init() {
    this.sql = postgres(this.config)

    await this.sql`
      CREATE TABLE IF NOT EXISTS kv_store (
        key TEXT PRIMARY KEY,
        value JSONB
      );
    `
  }

  override async get<T>(key: Deno.KvKey): Promise<T | null> {
    assert(this.sql, "Postgres not initialized")

    const rows = await this.sql`
      SELECT value FROM kv_store WHERE key = ${key.join("/")};
    `
    return rows[0].value ? JSON.parse(rows[0].value) : null
  }

  override async set(key: Deno.KvKey, value: unknown) {
    assert(this.sql, "Postgres not initialized")

    await this.sql`
      INSERT INTO kv_store (key, value)
      VALUES (${key.join("/")}, ${JSON.stringify(value)}::jsonb)
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
    `
  }
}
