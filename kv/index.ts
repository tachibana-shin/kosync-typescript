import { resolve } from "node:path"
import { SqliteKv } from "./drivers/sqlite-kv.ts"
import { SupabaseKv } from "./drivers/supabase-kv.ts"

export const kv = Deno.env.get("DENO_TEST")
  ? new SqliteKv(resolve(import.meta.dirname ?? "", "../sqlite.db?mode=ro"))
  : new SupabaseKv()
