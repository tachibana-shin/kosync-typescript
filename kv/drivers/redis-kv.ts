import { assert } from "@std/assert"
import { KvBase } from "../base.ts"
import { RedisClient } from "jsr:@iuioiua/redis"

export class RedisKv extends KvBase {
  private client?: RedisClient
  private conn?: Deno.Conn

  constructor(
    private readonly config: {
      hostname: string
      port: number
      username?: string
      password?: string
    }
  ) {
    super()
  }

  override async init() {
    this.conn = await Deno.connect({
      hostname: this.config.hostname,
      port: this.config.port
    })

    this.client = new RedisClient(this.conn)

    if (this.config.username && this.config.password) {
      await this.client.sendCommand([
        "AUTH",
        this.config.username,
        this.config.password
      ])
    }
  }

  override async get<T>(key: Deno.KvKey): Promise<T | null> {
    assert(this.client, "Redis not initialized")

    const value = await this.client.sendCommand(["GET", key.join("/")])
    if (value === null) return null

    try {
      return JSON.parse(value.toString()) as T
    } catch {
      return value as unknown as T
    }
  }

  override async set(key: Deno.KvKey, value: unknown) {
    assert(this.client, "Redis not initialized")

    const data = typeof value === "string" ? value : JSON.stringify(value)

    await this.client.sendCommand(["SET", key.join("/"), data])
  }
}
