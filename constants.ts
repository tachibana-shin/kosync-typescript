import { Context } from "hono"

export const SyncsConstants = {
  // kv key patterns
  user_key: (username: string) => `user:${username}:key`,
  doc_key: (username: string, document: string) =>
    `user:${username}:document:${document}`,

  // field names
  progress_field: "progress",
  percentage_field: "percentage",
  device_field: "device",
  device_id_field: "device_id",
  timestamp_field: "timestamp",

  // error codes
  error_no_kv: 1000,
  error_internal: 2000,
  error_unauthorized_user: 2001,
  error_user_exists: 2002,
  error_invalid_fields: 2003,
  error_document_field_missing: 2004
} as const

export const Errors = {
  1000: { status: 502, message: "Cannot connect to redis server." },
  2000: { status: 502, message: "Unknown server error." },
  2001: { status: 401, message: "Unauthorized" },
  2002: { status: 402, message: "Username is already registered." },
  2003: { status: 403, message: "Invalid request" },
  2004: { status: 403, message: "Field 'document' not provided." }
} as const

export function raiseError(c: Context, code: keyof typeof Errors) {
  return c.json(
    {
      code,
      message: Errors[code].message
    },
    Errors[code].status
  )
}
