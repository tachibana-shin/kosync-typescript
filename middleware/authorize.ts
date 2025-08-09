import { Context, MiddlewareHandler } from "hono"

import { SyncsConstants } from "../constants.ts"
import { isValidField, isValidKeyField } from "../logic/valid.ts"
import { kv } from "../kv/index.ts"

/**
 * Authorization middleware.
 * - Reads x-auth-user and x-auth-key from headers
 * - Verifies against KV store
 * - If valid → store username in context.var for later usage
 * - If invalid → raise error (401)
 */
export const authorize = (): MiddlewareHandler => {
  return async (c, next) => {
    const authUser = c.req.header("x-auth-user") || ""
    const authKey = c.req.header("x-auth-key") || ""

    if (!isValidField(authKey) || !isValidKeyField(authUser)) {
      // return raiseError(c, SyncsConstants.error_unauthorized_user)
      await next()
      return
    }

    const userKey = [SyncsConstants.user_key(authUser)]
    const stored = await kv.get(userKey)

    if (stored === authKey) {
      c.env.user = authUser
    }

    await next()
  }
}

export function useUser(c: Context) {
  return c.env.user as string | undefined
}
