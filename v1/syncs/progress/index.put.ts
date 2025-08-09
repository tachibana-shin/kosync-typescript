import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi"
import { raiseError, SyncsConstants } from "../../../constants.ts"
import { useUser } from "../../../middleware/authorize.ts"
import { isValidKeyField, isValidField } from "../../../logic/valid.ts"
import { kv } from "../../../kv/index.ts"

// ---- Schemas ----
const UpdateProgressSchema = z
  .object({
    document: z.string().min(3).openapi({ example: "chapter_1" }),
    percentage: z.number().min(0).max(100).openapi({ example: 50 }),
    progress: z.string().min(1).openapi({ example: "page_45" }),
    device: z.string().min(1).openapi({ example: "Kindle" }),
    device_id: z.string().optional().openapi({ example: "device123" })
  })
  .openapi("UpdateProgressRequest")

const UpdateProgressResponseSchema = z
  .object({
    document: z.string(),
    timestamp: z.number()
  })
  .openapi("UpdateProgressResponse")

// ---- Route definition ----
const updateProgressRoute = createRoute({
  method: "put",
  path: "/syncs/progress",
  request: {
    body: {
      content: {
        "application/json": {
          schema: UpdateProgressSchema
        }
      },
      required: true
    }
  },
  responses: {
    200: {
      description: "Progress updated successfully",
      content: {
        "application/json": {
          schema: UpdateProgressResponseSchema
        }
      }
    },
    401: { description: "Unauthorized" },
    403: { description: "Invalid fields or document not provided" },
    500: { description: "Internal server error" }
  }
})

const app = new OpenAPIHono()

app.openapi(updateProgressRoute, async (c) => {
  const { document, percentage, progress, device, device_id } =
    c.req.valid("json")
  const username = useUser(c)

  if (!username) return raiseError(c, SyncsConstants.error_unauthorized_user)

  if (!isValidKeyField(document)) {
    return raiseError(c, SyncsConstants.error_document_field_missing)
  }

  if (percentage == null || !isValidField(progress) || !isValidField(device)) {
    return raiseError(c, SyncsConstants.error_invalid_fields)
  }

  const timestamp = Math.floor(Date.now() / 1000)

  const docKey = [SyncsConstants.doc_key(username, document)]

  try {
    await kv.set(docKey, {
      [SyncsConstants.percentage_field]: percentage,
      [SyncsConstants.progress_field]: progress,
      [SyncsConstants.device_field]: device,
      [SyncsConstants.device_id_field]: device_id,
      [SyncsConstants.timestamp_field]: timestamp
    })

    return c.json({ document, timestamp }, 200)
  } catch (error) {
    console.error(error)
    return raiseError(c, SyncsConstants.error_internal)
  }
})

export default app
