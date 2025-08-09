import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi"

// ---- Schema ----
const HealthcheckResponseSchema = z
  .object({
    state: z.string().openapi({ example: "OK" })
  })
  .openapi("HealthcheckResponse")

// ---- Route ----
const healthcheckRoute = createRoute({
  method: "get",
  path: "/healthcheck",
  responses: {
    200: {
      description: "Service health status",
      content: {
        "application/json": {
          schema: HealthcheckResponseSchema
        }
      }
    }
  }
})

const app = new OpenAPIHono()

app.openapi(healthcheckRoute, (c) => {
  return c.json({ state: "OK" }, 200)
})

export default app
