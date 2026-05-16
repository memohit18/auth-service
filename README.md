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
├── postman/
│   └── auth-service.postman_collection.json   # Import into Postman
├── db-schema/                 # Git submodule (PostgreSQL + Mongo schemas)
├── src/
│   ├── common/crypto/         # PII encrypt at rest (`ENCRYPTION_KEY`)
│   ├── config/                # `app.config.ts` (port, URLs)
│   ├── prisma/                # Prisma client + UsersRepository (users table)
│   ├── modules/
│   │   ├── auth/             # JWT, signup, login, verify, Resend emails
│   │   ├── profiles/         # Admin-only `GET /profiles/users`
│   │   ├── health/
│   │   └── logs/             # Mongoose bootstrap
│   ├── app.module.ts
│   └── main.ts
├── .env / .env.example
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

Copy **`.env.example`** → **`.env`**.

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL |
| `MONGODB_URL` | Mongoose logs |
| `PORT` | API port (default `3300`) |
| `JWT_SECRET` / `JWT_EXPIRES_IN` | JWT (`access_token` cookie / Bearer) |
| `ENCRYPTION_KEY` | 64 hex chars — encrypts stored **email** & **phone** |
| `APP_URL` | Public API base URL |
| `FRONTEND_VERIFICATION_URL` | Email link `{base}/verify-email?token=`; **no SPA**: use `http://localhost:3300/auth` (see `.env.example`) |
| `RESEND_API_KEY` / `MAIL_FROM` | Resend mail (verification); skipped if unset |

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

### 4. Run PostgreSQL migrations

**Deploy existing migrations** (CI / production / new database):

```bash
npx prisma migrate deploy --schema=./db-schema/postgres/prisma/schema.prisma
```

**Develop new migrations** from schema edits:

```bash
npm run prisma:migrate:dev -- --name describe_change
```

### 5. Run the API

```bash
npm run start:dev
```

Health check: `GET http://localhost:<PORT>/health`

## Authentication flow

```text
POST /auth/signup
  → create user · emailVerificationToken = random hex (cleared → null after verify)
  → Resend: FRONTEND_VERIFICATION_URL + /verify-email?token=…

POST /auth/verify-email { token }    (recommended)
GET /auth/verify-email?token=…       (same handler; handy if link points at …/auth)

POST /auth/login
  → password + isEmailVerified
  → { success: true } + httpOnly cookie access_token (Bearer also accepted on later calls)

GET /auth/me · GET /profiles/users … → JwtAuthGuard + DB user; profiles need admin role
```

| Route | Summary |
|-------|---------|
| `POST /auth/signup` | `{ name, email, password }`; optional `{ role }`. Internal phone placeholder only. |
| `POST /auth/verify-email` | `{ token }` — plaintext token row match; column set `null`. |
| `GET /auth/verify-email` | `?token=` — same verification. |
| `POST /auth/resend-verification` | `{ email }` — generic success text (enumeration-safe). |
| `POST /auth/login` / `POST /auth/logout` | Minimal JSON login / clear cookie |
| `GET /auth/me` | **`Authorization: Bearer`** first; else **`access_token`** cookie. |

**Resend**: no separate mail REST route — only `ResendVerificationEmailService` inside signup/resend paths (`resend` package). Omit API key to skip outbound mail during dev.

**JWT**: Payload `{ sub }` only — every request resolves role/PII from Postgres after signature check.

**Postman**: import `postman/auth-service.postman_collection.json`.

### Curl (`PORT=3300`)

```bash
curl -s -X POST http://localhost:3300/auth/verify-email \
  -H "Content-Type: application/json" \
  -d '{"token":"YOUR_TOKEN_FROM_EMAIL_LINK"}'

curl -s -X POST http://localhost:3300/auth/resend-verification \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com"}'

curl -v -X POST http://localhost:3300/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{"email":"you@example.com","password":"yourpassword"}'

curl http://localhost:3300/auth/me -b cookies.txt
curl http://localhost:3300/auth/me -H "Authorization: Bearer TOKEN"
curl http://localhost:3300/profiles/users -H "Authorization: Bearer ADMIN_JWT_HERE"
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

**PostgreSQL migrations not applied** — `npx prisma migrate deploy --schema=./db-schema/postgres/prisma/schema.prisma`

**MongoDB connection errors** — verify `MONGODB_URL` in `.env` and that MongoDB is running
