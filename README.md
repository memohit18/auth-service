# auth-service

NestJS authentication service. Database schemas live in the [`db-schema`](https://github.com/memohit18/db-schema) Git submodule:

- **PostgreSQL** (`db-schema/postgres`) — auth, users, RBAC, relations (Prisma)
- **MongoDB** (`db-schema/mongodb`) — logs, events, analytics (Mongoose)

## Prerequisites

- Node.js 18+
- npm
- PostgreSQL (`DATABASE_URL`)
- MongoDB (`MONGODB_URL`)
- Git

## Project structure

```
auth-service/
├── src/
│   ├── common/
│   ├── config/
│   ├── prisma/              # PrismaModule (PostgreSQL)
│   ├── modules/
│   │   ├── auth/
│   │   ├── users/
│   │   ├── health/
│   │   └── logs/            # Mongoose activity logs
│   ├── app.module.ts
│   └── main.ts
├── db-schema/                 # Git submodule
│   ├── postgres/prisma/
│   └── mongodb/schemas/
├── .env
├── .env.example
├── package.json
├── tsconfig.json
└── nest-cli.json
```

## Clone this repository

```bash
git clone --recursive git@github.com:memohit18/auth-service.git
cd auth-service
```

If you already cloned without `--recursive`:

```bash
git submodule update --init --recursive
```

## Add the schema submodule (new project)

```bash
git submodule add git@github.com:memohit18/db-schema.git db-schema
git submodule update --init --recursive
git add .gitmodules db-schema
git commit -m "Add db-schema submodule for centralized database schema"
```

## Local setup

### 1. Install dependencies

```bash
npm install

cd db-schema && npm install && cd ..
```

### 2. Environment variables

Copy `.env.example` to `.env` and set:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public"
MONGODB_URL="mongodb://localhost:27017/auth_logs"
PORT=3300
```

Remote MongoDB example:

```env
MONGODB_URL="mongodb://USERNAME:PASSWORD@HOST:27017/auth_logs"
```

### 3. Generate Prisma client (PostgreSQL)

From **auth-service** root:

```bash
npm run prisma:generate
```

Equivalent:

```bash
npx prisma generate --schema=./db-schema/postgres/prisma/schema.prisma
```

### 4. Run PostgreSQL migrations (optional)

From **auth-service** root:

```bash
npm run prisma:migrate:dev -- --name init
```

Equivalent:

```bash
npx prisma migrate dev \
  --schema=./db-schema/postgres/prisma/schema.prisma \
  --name init
```

### 5. Run the API

```bash
npm run start:dev
```

Health check: `GET http://localhost:<PORT>/health`

## Authentication & authorization

### End-to-end flow

1. **Signup** — `POST /auth/signup` with `{ name, email, password }` (optional **`role`**). Email not verified yet; **no JWT**. **Resend** sends mail when **`RESEND_API_KEY`** and **`MAIL_FROM`** are configured.
2. **Verify email** — **`POST /auth/verify-email`** body `{ "token": "..." }` (token copied from **`FRONTEND_VERIFICATION_URL/verify-email?token=`** link). Optionally **`GET /auth/verify-email?token=`** works for tooling. Afterwards **`emailVerificationToken`** is **`null`** in PostgreSQL.
3. **Login** — **`POST /auth/login`**. Credentials + **`isEmailVerified`** enforced; JWT only after step 2.
4. **Resend** — **`POST /auth/resend-verification`** `{ "email": "..." }`; always returns the same generic success wording (enumeration-safe).

### Email (Resend — no SMTP Nest module)

No public **`/mail/send`** route. Sending runs only inside **`signup`** (and **`resend-verification`**) via **`ResendVerificationEmailService`** (**`resend` npm**).

**.env**: **`RESEND_API_KEY`**, **`MAIL_FROM`**, **`FRONTEND_VERIFICATION_URL`** (verification link opens your SPA).

| DB `emailVerificationToken` | Behaviour |
|-----------------------------|-----------|
| Random hex string (`randomBytes`) | Stored **as-is** until verify; **`null`** after success; `resend` issues a fresh value. |

### Login response (minimal JSON)

Successful login responds with **`{ "success": true }` only.**

The JWT is **not placed in the response body.** It is set on the response as an **HTTP-only cookie** (`access_token`, `SameSite=lax`; `Secure` when `NODE_ENV=production`). Use that cookie on same-origin requests, or forward it as Bearer for API clients.

### JWT contents (recommended security)

Tokens are **signed with `JWT_SECRET`** (HMAC-SHA256). Payload is minimal: **`{ "sub": "<user id>" }`**. There are no embedded role or PII claims, so attackers cannot escalate privileges by editing the payload—they would invalidate the signature.

On **every protected request**, `JwtStrategy`:

1. **Extracts** the raw JWT: **`Authorization: Bearer <token>` first**, then the `access_token` cookie if no Bearer header.
2. **Verifies** the signature and expiry (`passport-jwt`).
3. **Loads** the user from PostgreSQL using `payload.sub`.
4. **Re-validates**: account exists, not soft-deleted, **email verified**. If anything fails → `401`.
5. **Attaches** `role`, `name`, email, phone, etc. **from the database** onto `request.user` for guards and controllers.

Protected routes rely on **`JwtAuthGuard`** (steps above). Role checks use **`RolesGuard`** plus `@Roles(...)`, comparing `request.user.role` to the configured role (**always refreshed from DB** on each call).

### Current user profile (after login)

`GET /auth/me` requires a valid Bearer token or cookie. Returns **`{ success, user }`** with `id`, `name`, `email`, `phone`, `countryCode`, `role`, `isEmailVerified`. Use this so clients never need JWT claims decoded for identity.

### Admin user listing

- `GET /profiles/users`
- `GET /profiles/users/:id`

Protected by **`JwtAuthGuard`** + **`RolesGuard`** with **`Role.Admin`** (JWT + DB-loaded user).

### Curl examples (`PORT=3300`)

```bash
curl -s -X POST http://localhost:3300/auth/verify-email \
  -H "Content-Type: application/json" \
  -d '{"token":"YOUR_TOKEN_FROM_EMAIL_LINK"}'

curl -s -X POST http://localhost:3300/auth/resend-verification \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com"}'

# Login (JWT in Set-Cookie access_token — use Bearer from -v output if needed)
curl -v -X POST http://localhost:3300/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{"email":"you@example.com","password":"yourpassword"}'

# Session / profile (cookie)
curl http://localhost:3300/auth/me -b cookies.txt

# Bearer (replace TOKEN with JWT string — same value as cookie or from tooling)
curl http://localhost:3300/auth/me \
  -H "Authorization: Bearer TOKEN"

curl http://localhost:3300/profiles/users \
  -H "Authorization: Bearer ADMIN_JWT_HERE"
```

## npm scripts

| Script | Description |
|--------|-------------|
| `npm run prisma:generate` | Generate Prisma client from postgres schema |
| `npm run prisma:migrate:dev` | Run Prisma migrate dev (pass `-- --name <name>`) |
| `npm run start:dev` | NestJS watch mode |
| `npm run build` | Compile to `dist/` |
| `npm run start:prod` | Run production build |

## Keep the submodule up to date

```bash
git submodule update --init --recursive
git submodule update --remote db-schema
npm run prisma:generate
```

## Centralized schema

| | |
|---|---|
| Submodule | `db-schema/` |
| PostgreSQL schema | `db-schema/postgres/prisma/schema.prisma` |
| MongoDB schemas | `db-schema/mongodb/schemas/` |
| Docs | [`db-schema/README.md`](db-schema/README.md) |

## Troubleshooting

**`db-schema/` is empty** — `git submodule update --init --recursive`

**`@prisma/client did not initialize yet`** — `npm run prisma:generate`

**`Cannot find module 'dist/main'`** — `npm run build` or use `npm run start:dev` (Nest resolves `dist/src/main.js`)

**MongoDB connection errors** — verify `MONGODB_URL` in `.env` and that MongoDB is running
