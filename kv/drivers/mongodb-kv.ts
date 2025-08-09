import { assert } from "@std/assert"
import { KvBase } from "../base.ts"
import { MongoClient, Collection } from "npm:mongodb@6.1.0"

interface KvDocument {
  key: string
  value: unknown
}

export class MongoDbKv extends KvBase {
  private client?: MongoClient
  private collection?: Collection<KvDocument>
  private collectionName = "kv_store"

  constructor(private readonly uri: string, private readonly dbName: string) {
    super();
  }

  override async init(): Promise<void> {
    this.client = new MongoClient(this.uri)
    await this.client.connect()

    const db = this.client.db(this.dbName)
    this.collection = db.collection<KvDocument>(this.collectionName)

    await this.collection.createIndex({ key: 1 }, { unique: true })
  }

  override async get<T>(key: Deno.KvKey): Promise<T | null> {
    assert(this.collection, "MongoDB not initialized")

    const doc = await this.collection.findOne({ key: key.join("/") })
    return doc ? (doc.value as T) : null
  }

  override async set(key: Deno.KvKey, value: unknown): Promise<void> {
    assert(this.collection, "MongoDB not initialized")

    await this.collection.updateOne(
      { key: key.join("/") },
      { $set: { value } },
      { upsert: true }
    )
  }
}
