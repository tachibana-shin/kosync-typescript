import { assert } from "@std/assert"
import { KvBase } from "../base.ts"
import { DuckDBConnection, DuckDBInstance } from "npm:@duckdb/node-api"

export class DuckDBKv extends KvBase {
  private instance?: DuckDBInstance
  private connection?: DuckDBConnection
  private tableName = "kv_store"

  constructor(private readonly path: string) {
    super()
  }

  override async init(): Promise<void> {
    this.instance = await DuckDBInstance.create(this.path)
    this.connection = await this.instance.connect()

    await this.connection.run(`
      CREATE TABLE IF NOT EXISTS ${this.tableName} (
        key TEXT PRIMARY KEY,
        value JSON
      )
    `)
  }

  override async get<T>(key: Deno.KvKey): Promise<T | null> {
    assert(this.connection, "DuckDB not initialized")

    const prepared = await this.connection.prepare(
      `SELECT value FROM ${this.tableName} WHERE key = $1`
    )
    prepared.bindVarchar(1, key.join("/"))
    const reader = await prepared.runAndReadAll()
    const rows = reader.getRows()

    if (!rows?.[0]?.[0]) return null

    try {
      return JSON.parse(rows[0]![0]!.toString()) as T
    } catch {
      return rows[0][0] as T
    }
  }

  override async set(key: Deno.KvKey, value: unknown): Promise<void> {
    assert(this.connection, "DuckDB not initialized")

    const prepared = await this.connection.prepare(`
      INSERT INTO ${this.tableName} (key, value)
      VALUES ($1, $2)
      ON CONFLICT (key) DO UPDATE SET value = excluded.value
    `)
    prepared.bindVarchar(1, key.join("/"))
    prepared.bindVarchar(2, JSON.stringify(value))
    await prepared.run()
  }
}
