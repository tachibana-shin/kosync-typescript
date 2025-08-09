import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi"
import { raiseError, SyncsConstants } from "../../constants.ts"
import { isValidKeyField, isValidField } from "../../logic/valid.ts"
import { kv } from "../../kv/index.ts"

// ---- Schemas ----
const CreateUserSchema = z
  .object({
    username: z.string().min(3).openapi({ example: "touma" }),
    password: z.string().min(6).openapi({ example: "misaki_shokuhou" })
  })
  .openapi("CreateUserRequest")

const UserResponseSchema = z
  .object({
    username: z.string()
  })
  .openapi("UserResponse")

// ---- Route definition ----
const createUserRoute = createRoute({
  method: "post",
  path: "/users/create",
  request: {
    body: {
      content: {
        "application/json": {
          schema: CreateUserSchema
        }
      },
      required: true
    }
  },
  responses: {
    201: {
      description: "User created successfully",
      content: {
        "application/json": {
          schema: UserResponseSchema
        }
      }
    },
    400: { description: "Invalid fields" },
    409: { description: "User already exists" },
    500: { description: "Internal server error" }
  }
})

const app = new OpenAPIHono()

app.openapi(createUserRoute, async (c) => {
  const { username, password } = c.req.valid("json")

  if (!isValidKeyField(username) || !isValidField(password)) {
    return raiseError(c, SyncsConstants.error_invalid_fields)
  }

  const userKey = [SyncsConstants.user_key(username)]

  try {
    const existing = await kv.get(userKey)

    if (existing === null) {
      try {
        await kv.set(userKey, password)

        return c.json({ username }, 201)
      } catch (error) {
        console.error(error)

        return raiseError(c, SyncsConstants.error_internal)
      }
    }

    return raiseError(c, SyncsConstants.error_user_exists)
  } catch (error) {
    console.error(error)

    return raiseError(c, SyncsConstants.error_internal)
  }
})

export default app
