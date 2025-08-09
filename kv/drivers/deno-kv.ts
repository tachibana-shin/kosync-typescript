import { assert } from "@std/assert"
import { KvBase } from "../base.ts"

export class DenoKv extends KvBase {
  private kv?: Deno.Kv

  override async init() {
    this.kv = await Deno.openKv()
  }

  override async get<T>(key: Deno.KvKey) {
    assert(this.kv, "Kv not initialized")

    const { value } = await this.kv!.get<T>(key)

    return value
  }

  override async set(key: Deno.KvKey, value: unknown) {
    assert(this.kv, "Kv not initialized")

    await this.kv!.set(key, value)
  }
}
