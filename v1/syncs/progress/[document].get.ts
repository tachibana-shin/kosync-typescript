import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi"
import { raiseError, SyncsConstants } from "../../../constants.ts"
import { isValidKeyField } from "../../../logic/valid.ts"
import { useUser } from "../../../middleware/authorize.ts"
import { kv } from "../../../kv/index.ts"

// ---- Schemas ----
const GetProgressParamsSchema = z.object({
  document: z.string().min(3).openapi({ example: "chapter_1" })
})

const GetProgressResponseSchema = z
  .object({
    document: z.string(),
    percentage: z.number().optional(),
    progress: z.string().optional(),
    device: z.string().optional(),
    device_id: z.string().optional(),
    timestamp: z.number().optional()
  })
  .openapi("GetProgressResponse")

// ---- Route ----
const getProgressRoute = createRoute({
  method: "get",
  path: "/syncs/progress/{document}",
  request: {
    params: GetProgressParamsSchema
  },
  responses: {
    200: {
      description: "Progress retrieved successfully",
      content: {
        "application/json": {
          schema: GetProgressResponseSchema
        }
      }
    },
    401: { description: "Unauthorized" },
    403: { description: "Invalid document field" },
    500: { description: "Internal server error" }
  }
})

const app = new OpenAPIHono()

app.openapi(getProgressRoute, async (c) => {
  // --- Authorization ---
  const username = useUser(c)
  if (!username) {
    return raiseError(c, SyncsConstants.error_unauthorized_user)
  }

  const { document } = c.req.valid("param")
  if (!isValidKeyField(document)) {
    return raiseError(c, SyncsConstants.error_document_field_missing)
  }

  // --- Get data ---
  const key = [SyncsConstants.doc_key(username, document)]
  const stored = await kv.get<Record<string, unknown>>(key)

  if (!stored) {
    return c.json({}, 200)
  }

  const res: Record<string, unknown> = {}

  if (stored[SyncsConstants.percentage_field] != null) {
    res.percentage = Number(stored[SyncsConstants.percentage_field])
  }
  if (stored[SyncsConstants.progress_field] != null) {
    res.progress = String(stored[SyncsConstants.progress_field])
  }
  if (stored[SyncsConstants.device_field] != null) {
    res.device = String(stored[SyncsConstants.device_field])
  }
  if (stored[SyncsConstants.device_id_field] != null) {
    res.device_id = String(stored[SyncsConstants.device_id_field])
  }
  if (stored[SyncsConstants.timestamp_field] != null) {
    res.timestamp = Number(stored[SyncsConstants.timestamp_field])
  }

  if (Object.keys(res).length > 0) {
    res.document = document
  }

  return c.json(res, 200)
})

export default app
