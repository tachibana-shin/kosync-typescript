import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi"
import { raiseError, SyncsConstants } from "../../constants.ts"
import { useUser } from "../../middleware/authorize.ts"

// ---- Route definition ----
const authUserRoute = createRoute({
  method: "get",
  path: "/users/auth",
  responses: {
    200: {
      description: "User authorized successfully",
      content: {
        "application/json": {
          schema: z.object({
            authorized: z.string().openapi({ example: "OK" })
          })
        }
      }
    },
    401: { description: "Unauthorized" }
  }
})

const app = new OpenAPIHono()

app.openapi(authUserRoute, (c) => {
  const authorized = useUser(c)

  if (authorized) {
    return c.json({ authorized: "OK" }, 200)
  } else {
    return raiseError(c, SyncsConstants.error_unauthorized_user)
  }
})

export default app
