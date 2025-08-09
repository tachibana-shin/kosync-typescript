# kosync-typescript

A compact KOSync backend written in TypeScript for KOReader. Runs on Deno + Hono and can be deployed 100% free using Deno Deploy + Supabase (free).

- Runtime/server: Deno + Hono
- Validation/OpenAPI: zod + @hono/zod-openapi
- Storage: KV abstraction with multiple drivers (SQLite, Deno KV, Supabase, Redis, Postgres, MongoDB, DuckDB)
- API base path: `/v1`


## Features
- User sign-up with username/password stored in a KV store
- Lightweight auth via `x-auth-user` and `x-auth-key` headers
- Persist reading progress per document and retrieve the latest record
- Healthcheck endpoint

## How to deploy free?
1. Register [Supabase](https://supabase.com)
2. Create project `Supabase`
3. Get `SUPABASE_URL` and `SUPABASE_KEY`
4. Deploy to [Deno Deploy](https://deno.com/deploy)
5. Set env get from `3)` to settings project
6. Enjoy

## Directory structure
- `main.ts`: bootstraps Hono app, middleware, routes, and Deno.serve
- `constants.ts`: constants, error codes and `raiseError` helper
- `middleware/authorize.ts`: reads headers, validates against KV, attaches `user` to context
- `logic/valid.ts`: simple input validators
- `kv/`: KV abstraction (KvBase) and drivers
  - `kv/index.ts`: selects the KV driver used at runtime
  - `kv/drivers/*`: KV drivers (sqlite, deno-kv, supabase, redis, postgres, mongodb, duckdb)
- `v1/`: API routes
  - `healthcheck.ts`
  - `users/`
    - `auth.get.ts`
    - `create.post.ts`
  - `syncs/progress/`
    - `index.put.ts`
    - `[document].get.ts`
- `deno.json`: tasks and import map
- `main_test.ts`: integration tests (expects server running)


## Run locally
Requirements: Deno v1.41+ (npm compatibility enabled).

By default the project uses the SQLite driver (see `kv/index.ts`) in test. You can:
- Keep SQLite for local development, or
- Switch to Deno KV for a zero-setup local store

Start the server:
- Dev (watch): `deno task dev`
- Local prod-like: `deno task start`

The server listens on `http://localhost:8000` and exposes the API under `/v1`.

Notes about KV drivers locally:
- SQLite (default): a `sqlite.db` file is created in the project directory.
- Deno KV: switch to `DenoKv` in `kv/index.ts` if you prefer no SQLite dependency (see "Choose a KV driver").


## API
Base URL: `http://localhost:8000/v1` (or your Deno Deploy URL + `/v1`)

1) Healthcheck
- `GET /healthcheck`
- Response: `200 { "state": "OK" }`

2) Create user
- `POST /users/create`
- JSON body: `{ "username": string(min 3), "password": string(min 6) }`
- Response: `201 { "username": "..." }`
- Errors:
  - `402 { "code": 2002, "message": "Username is already registered." }`
  - `403 { "code": 2003, "message": "Invalid request" }`

Example:
```
curl -X POST http://localhost:8000/v1/users/create \
  -H "Content-Type: application/json" \
  -d '{"username":"alice","password":"secret123"}'
```

3) Check authorization
- `GET /users/auth`
- Required headers:
  - `x-auth-user`: username
  - `x-auth-key`: password used at sign-up
- Responses:
  - `200 { "authorized": "OK" }`
  - `401 { "code": 2001, "message": "Unauthorized" }`

Example:
```
curl -X GET http://localhost:8000/v1/users/auth \
  -H "x-auth-user: alice" \
  -H "x-auth-key: secret123"
```

4) Update reading progress
- `PUT /syncs/progress`
- Required headers: `x-auth-user`, `x-auth-key`
- JSON body:
  ```json
  {
    "document": "string (min 3)",
    "percentage": 0-100,
    "progress": "string",
    "device": "string",
    "device_id": "string (optional)"
  }
  ```
- Response: `200 { "document": "...", "timestamp": number }`
- Errors: `401 Unauthorized`, `403 Invalid fields`, `500 Internal`

Example:
```
curl -X PUT http://localhost:8000/v1/syncs/progress \
  -H "Content-Type: application/json" \
  -H "x-auth-user: alice" \
  -H "x-auth-key: secret123" \
  -d '{
        "document": "book_1984",
        "percentage": 42,
        "progress": "page_124",
        "device": "KOReader"
      }'
```

5) Get reading progress by document
- `GET /syncs/progress/{document}`
- Required headers: `x-auth-user`, `x-auth-key`
- Success responses:
  - `200 {}` (if no data)
  - `200 { document, percentage?, progress?, device?, device_id?, timestamp? }`

Example:
```
curl -X GET http://localhost:8000/v1/syncs/progress/book_1984 \
  -H "x-auth-user: alice" \
  -H "x-auth-key: secret123"
```


## Choose a KV driver
Default: `kv/index.ts` uses SQLite. You can switch to any of the provided drivers depending on your environment:
- Deno KV (zero config; great for local or Deno Deploy with KV enabled)
- Supabase (ideal for free deployment with Deno Deploy + Supabase)
- Redis, Postgres, MongoDB, DuckDB (require extra setup/services)

How to switch:
- Open `kv/index.ts` and replace the `kv` initialization with the desired driver.
- Supabase example:
  - Set env vars `SUPABASE_URL` and `SUPABASE_KEY`
  - Create table `kv_store` on your Supabase Postgres (see below)
  - Use the `SupabaseKv` driver

Example (illustrative):
```ts
import { SupabaseKv } from "./drivers/supabase-kv.ts"
export const kv = new SupabaseKv()
```

Deno KV example:
```ts
import { DenoKv } from "./drivers/deno-kv.ts"
export const kv = new DenoKv()
```

Make sure `await kv.init()` is called before serving requests (already done in `main.ts`).


## Free deployment with Deno Deploy + Supabase
Goal: run the app on Deno Deploy and store data in Supabase (free tier).

Step 1: Prepare Supabase (free tier)
- Create a project at https://supabase.com/ (free tier)
- Obtain the following:
  - `SUPABASE_URL`: Project URL
  - `SUPABASE_KEY`: Service role key or anon key. For server-only access, service role key is recommended.
- Create the `kv_store` table in your Database via SQL Editor:
```
create table if not exists kv_store (
  key text primary key,
  value jsonb
);
```
Notes:
- If Row Level Security (RLS) is enabled, using the Service Role key allows unrestricted access from server-side. Do not expose it to the client.

Step 2: Switch the KV driver to Supabase
- Edit `kv/index.ts` and use `SupabaseKv` as shown above.

Step 3: Push source to GitHub
- Push this repository to your own GitHub account

Step 4: Create a project on Deno Deploy
- Go to https://dash.deno.com/ → New Project → Link your GitHub repo
- Select `main.ts` as the entrypoint
- Set Environment Variables:
  - `SUPABASE_URL` = your Supabase project URL
  - `SUPABASE_KEY` = your Supabase service role key (recommended)
- Deploy

Step 5: Verify
- Healthcheck: `https://<your-app>.deno.dev/v1/healthcheck`
- Create user, auth, update/get progress as in the API section

Security considerations:
- This demo stores passwords in plain text in KV. For real use, hash passwords (e.g., bcrypt/argon2) before storing.
- Consider rate limiting, stricter auth, and CORS rules for production.


## KOReader integration (hint)
- Server base URL: `https://<your-app>.deno.dev/v1`
- Create an account via `/users/create`
- Client must send headers:
  - `x-auth-user`: username
  - `x-auth-key`: password
- Update progress via `PUT /syncs/progress` with the schema above.

Depending on KOReader version/config, you may need a plugin or custom configuration to send custom headers.


## Testing
Integration tests live in `main_test.ts` and exercise the HTTP API.
- Terminal A: start the local server
  - `deno task start`
- Terminal B: run tests with full permissions (HTTP calls to localhost)
  - `deno test -A main_test.ts`

With the SQLite driver, tests operate on `sqlite.db` in the repo directory.


## License
See the LICENSE file for details.
