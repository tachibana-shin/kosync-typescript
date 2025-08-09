export abstract class KvBase {
  abstract init(): Promise<void>

  abstract get<T>(key: Deno.KvKey): Promise<T | null>
  abstract set(key: Deno.KvKey, value: unknown): Promise<void>
}
