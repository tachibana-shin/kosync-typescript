// deno-lint-ignore-file require-await
import { DatabaseSync } from "node:sqlite"
import { assert } from "@std/assert"
import { KvBase } from "../base.ts"

export class SqliteKv extends KvBase {
  private db?: DatabaseSync

  constructor(private readonly path: string) {
    super()
  }

  override async init(): Promise<void> {
    this.db = new DatabaseSync(this.path)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS kv (
        key TEXT PRIMARY KEY,
        value TEXT
      )
    `)
  }

  override async get<T>(key: Deno.KvKey): Promise<T | null> {
    assert(this.db, "Kv not initialized")
    const row = this.db
      .prepare("SELECT value FROM kv WHERE key = ?")
      .get(key.join("/"))

    if (!row?.value) return null
    return JSON.parse(row.value.toString()) ?? null
  }

  override async set(key: Deno.KvKey, value: unknown) {
    assert(this.db, "Kv not initialized")
    const raw = JSON.stringify(value)
    this.db
      .prepare(
        `
      INSERT INTO kv (key, value) VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `
      )
      .run(key.join("/"), raw)
  }

  close(): void {
    this.db?.close()
  }
}
