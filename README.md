# auth-service

NestJS authentication service. Database models and migrations live in the [`db-schema`](https://github.com/memohit18/db-schema)[private-repo] Git submodule so all services share one centralized Prisma schema.

## Prerequisites

- Node.js 18+
- npm
- PostgreSQL (reachable via `DATABASE_URL`)
- Git

## Project structure

```
auth-service/
├── src/
│   ├── common/
│   ├── config/
│   ├── prisma/           # PrismaModule + PrismaService
│   ├── modules/
│   │   ├── auth/
│   │   ├── users/
│   │   └── health/
│   ├── app.module.ts
│   └── main.ts
├── db-schema/              # Git submodule → centralized schema
│   └── prisma/
├── .env                    # Local secrets (gitignored)
├── package.json
├── tsconfig.json
├── tsconfig.build.json
└── nest-cli.json
```

## Clone this repository

Clone **with submodules** so `db-schema` is populated in one step:

```bash
git clone --recursive git@github.com:memohit18/auth-service.git
cd auth-service
```

If you already cloned without `--recursive`:

```bash
git submodule update --init --recursive
```

## Add the schema submodule (new service / first-time setup)

From the root of a service repo that should use the shared schema:

```bash
git submodule add git@github.com:memohit18/db-schema.git db-schema
git submodule update --init --recursive
git add .gitmodules db-schema
git commit -m "Add db-schema submodule for centralized database schema"
```

Push the service repo. Anyone who clones it should run:

```bash
git submodule update --init --recursive
```

## Local setup

### 1. Install dependencies

```bash
# Auth service (NestJS)
npm install

# Submodule (Prisma CLI + schema tooling)
cd db-schema
npm install
cd ..
```

### 2. Environment variables

Create `.env` in the **auth-service** root (this file is gitignored):

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public"
PORT=3000
```

Use the same `DATABASE_URL` when running Prisma commands against the shared schema.

### 3. Generate Prisma client

From the auth-service root (required after `npm install` or submodule updates):

```bash
npm run prisma:generate
```

This generates the client from `db-schema/prisma/schema.prisma` and copies it into `node_modules/.prisma/client` for this service. `prestart:dev` and `postinstall` run this automatically.

### 4. Apply schema to the database (optional)

Run migrations from the submodule (recommended for shared environments):

```bash
cd db-schema
npx prisma migrate deploy
cd ..
```

For local development you can use `npx prisma db push` instead — see [`db-schema/README.md`](db-schema/README.md).

### 5. Run the API

```bash
# Development (watch mode)
npm run start:dev

# Production build + run
npm run build
npm run start:prod
```

The server listens on `PORT` from `.env`, or **3000** by default.

## npm scripts

| Script | Description |
|--------|-------------|
| `npm run start:dev` | Start NestJS in watch mode |
| `npm run build` | Compile to `dist/` |
| `npm run start` | Run compiled app (`dist/main.js`) |
| `npm run start:prod` | Same as `start` (production) |

## Keep the submodule up to date

Pull the submodule commit recorded in this repo:

```bash
git submodule update --init --recursive
```

Fetch the latest `db-schema` from its remote and update the pointer (then commit the change in auth-service):

```bash
git submodule update --remote db-schema
```

After updating the submodule, regenerate the client:

```bash
npx prisma generate --schema=./db-schema/prisma/schema.prisma
```

## Centralized schema

| | |
|---|---|
| Submodule path | `db-schema/` |
| Repository | [github.com/memohit18/db-schema](https://github.com/memohit18/db-schema) |
| Schema file | `db-schema/prisma/schema.prisma` |
| Docs | [`db-schema/README.md`](db-schema/README.md) |

Schema changes are made in the **db-schema** repo, not duplicated in auth-service.

## Troubleshooting

**`db-schema/` is empty after clone** — run `git submodule update --init --recursive`.

**`Cannot find module 'dist/main'`** — run `npm run build` before `npm run start`, or use `npm run start:dev`.

**Port already in use** — change `PORT` in `.env` or stop the process using port 3000.

**`@prisma/client did not initialize yet`** — run `npm run prisma:generate`.

**Prisma client out of date** — run `npm run prisma:generate` after pulling submodule updates.
