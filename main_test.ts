// syncs_controller_test.ts
import { assertEquals, assert } from "@std/assert"
import { resolve } from "node:path"
import { DatabaseSync } from "node:sqlite"

// Clear Redis DB (database index 2)
function clearDb() {
  const db = new DatabaseSync(
    resolve(import.meta.dirname ?? "", "sqlite.db") + "?mode=ro"
  )
  db.exec(`DELETE FROM kv`)
}

// Helper: send HTTP request
async function hit({
  method,
  path,
  body,
  headers
}: {
  method: string
  path: string
  body?: unknown
  headers?: Record<string, string>
}) {
  const res = await fetch(`http://localhost:8000/v1${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers
    },
    body: body ? JSON.stringify(body) : undefined
  })

  const data = await res.json().catch(() => ({}))
  return { status: res.status, body: data }
}

// Helper: register new user
async function register(username: string, userkey: string) {
  return await hit({
    method: "POST",
    path: "/users/create",
    body: { username, password: userkey }
  })
}

// Helper: authorize user
async function authorize(username: string, userkey: string) {
  return await hit({
    method: "GET",
    path: "/users/auth",
    headers: {
      "x-auth-user": username,
      "x-auth-key": userkey
    }
  })
}

// Helper: get sync progress
async function getProgress(
  username: string,
  userkey: string,
  document: string
) {
  return await hit({
    method: "GET",
    path: `/syncs/progress/${document}`,
    headers: {
      "x-auth-user": username,
      "x-auth-key": userkey
    }
  })
}

// Helper: update sync progress
async function updateProgress(
  username: string,
  userkey: string,
  document: string,
  percentage: number,
  progress: string,
  device: string
) {
  return await hit({
    method: "PUT",
    path: "/syncs/progress",
    headers: {
      "x-auth-user": username,
      "x-auth-key": userkey
    },
    body: {
      document,
      progress,
      percentage,
      device
    }
  })
}

// ------------------ TESTS ------------------
Deno.test({
  name: "SyncsController",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async (t) => {
    await clearDb()

    await t.step("#create", async (t) => {
      await clearDb()

      await t.step("adds new user", async () => {
        const res = await register("new-user", "passwd123")

        assertEquals(res.status, 201)
        assertEquals(res.body, { username: "new-user" })
      })

      await clearDb()
      await t.step("cannot add duplicated user", async () => {
        let res = await register("new-user", "passwd123")
        assertEquals(res.status, 201)
        assertEquals(res.body, { username: "new-user" })

        res = await register("new-user", "passwd123")
        assertEquals(res.status, 402)
        assertEquals(res.body, {
          code: 2002,
          message: "Username is already registered."
        })
      })
    })

    await t.step("#auth", async () => {
      await clearDb()

      const username = "user1"
      const userkey = "passwd123"
      await register(username, userkey)

      let res = await authorize(username, "")
      assertEquals(res.status, 401)
      assertEquals(res.body, { code: 2001, message: "Unauthorized" })

      res = await authorize(username, "wrong_password")
      assertEquals(res.status, 401)
      assertEquals(res.body, { code: 2001, message: "Unauthorized" })

      res = await authorize(username, userkey)
      assertEquals(res.status, 200)
      assertEquals(res.body.authorized, "OK")
    })

    await t.step("#sync", async (t) => {
      await clearDb()

      const username = "user1"
      const userkey = "passwd123"
      const doc = "89isjkdaj9j"

      await register(username, userkey)

      await t.step("should authorize before getting progress", async () => {
        const res = await getProgress(username, userkey + "wrong", doc)
        assertEquals(res.status, 401)
        assertEquals(res.body, { code: 2001, message: "Unauthorized" })
      })

      await t.step("should authorize before updating progress", async () => {
        const res = await updateProgress(
          username,
          userkey + "wrong",
          doc,
          0.32,
          "56",
          "my kpw"
        )
        assertEquals(res.status, 401)
        assertEquals(res.body, { code: 2001, message: "Unauthorized" })
      })

      await t.step("should update document progress", async () => {
        const res = await updateProgress(
          username,
          userkey,
          doc,
          0.32,
          "56",
          "my kpw"
        )
        assertEquals(res.status, 200)
        assertEquals(res.body.document, doc)
        assert(res.body.timestamp)
      })

      await t.step("cannot get progress of non-existent document", async () => {
        await updateProgress(username, userkey, doc, 0.32, "56", "my kpw")
        const res = await getProgress(username, userkey, doc + "non_existent")
        assertEquals(res.status, 200)
        assertEquals(res.body, {})
      })

      await t.step("should get document progress", async () => {
        await updateProgress(username, userkey, doc, 0.32, "56", "my kpw")
        const res = await getProgress(username, userkey, doc)
        assertEquals(res.status, 200)
        assert(res.body.timestamp)
        delete res.body.timestamp
        assertEquals(res.body, {
          document: doc,
          percentage: 0.32,
          progress: "56",
          device: "my kpw"
        })
      })

      await t.step("should get the latest document progress", async () => {
        await updateProgress(username, userkey, doc, 0.32, "56", "my kpw")
        await updateProgress(username, userkey, doc, 0.22, "36", "my pb")

        const res = await getProgress(username, userkey, doc)
        assertEquals(res.status, 200)
        assert(res.body.timestamp)
        delete res.body.timestamp
        assertEquals(res.body, {
          document: doc,
          percentage: 0.22,
          progress: "36",
          device: "my pb"
        })
      })
    })

    await clearDb()
  }
})
