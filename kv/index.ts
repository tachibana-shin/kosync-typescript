import { join, resolve } from "node:path"
import { DenoKv } from "./drivers/deno-kv.ts"
import { SqliteKv } from "./drivers/sqlite-kv.ts"

export const kv = new SqliteKv(
  resolve(import.meta.dirname ?? "", "../sqlite.db?mode=ro")
)
