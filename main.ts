import { Hono } from "hono"
import { etag } from "hono/etag"
import { logger } from "hono/logger"
import { authorize } from "./middleware/authorize.ts"
import { kv } from "./kv/index.ts"

import healthcheck from "./v1/healthcheck.ts"
import userAuthRoute from "./v1/users/auth.get.ts"
import userCreateRoute from "./v1/users/create.post.ts"
import getProgressRoute from "./v1/syncs/progress/[document].get.ts"
import updateProgressRoute from "./v1/syncs/progress/index.put.ts"

await kv.init()

const app = new Hono().basePath("/v1")
app.use(etag(), logger())

app.use(authorize())

// Healthcheck
app.route("/", healthcheck)

// Users
app.route("/", userAuthRoute)
app.route("/", userCreateRoute)

// Syncs
app.route("/", updateProgressRoute)
app.route("/", getProgressRoute)

Deno.serve(app.fetch)
