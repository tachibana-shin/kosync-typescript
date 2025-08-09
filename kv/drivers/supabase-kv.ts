import { assert } from "@std/assert"
import { createClient, SupabaseClient } from "jsr:@supabase/supabase-js@2"
import { KvBase } from "../base.ts"

export class SupabaseKv extends KvBase {
  private client?: SupabaseClient
  private tableName = Deno.env.get("TABLE_NAME") ?? "kv_store"

  // deno-lint-ignore require-await
  override async init(): Promise<void> {
    const url = Deno.env.get("SUPABASE_URL")
    const key = Deno.env.get("SUPABASE_KEY")

    assert(url, "Missing SUPABASE_URL env")
    assert(key, "Missing SUPABASE_KEY env")

    this.client = createClient(url, key)
  }

  override async get<T>(key: Deno.KvKey): Promise<T | null> {
    assert(this.client, "Supabase not initialized")

    const { data, error } = await this.client
      .from(this.tableName)
      .select("value")
      .eq("key", key.join("/"))
      .single()

    if (error) {
      if (error.code === "PGRST116") return null // not found
      throw error
    }

    console.log(data.value)

    return JSON.parse(data.value) as T
  }

  override async set(key: Deno.KvKey, value: unknown): Promise<void> {
    assert(this.client, "Supabase not initialized")

    const { error } = await this.client.from(this.tableName).upsert(
      {
        key: key.join("/"),
        value: JSON.stringify(value)
      },
      {
        onConflict: "key"
      }
    )

    if (error) throw error
  }
}
