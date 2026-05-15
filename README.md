# auth-service

NestJS authentication service. Database schemas live in the [`db-schema`](https://github.com/memohit18/db-schema) Git submodule:

- **PostgreSQL** (`db-schema/postgres`) — auth, users, RBAC, relations (Prisma)
- **MongoDB** (`db-schema/mongodb`) — logs, events, analytics (Mongoose)

## Prerequisites

- Node.js 18+
- npm
- PostgreSQL (`DATABASE_URL`)
- MongoDB (`MONGODB_URI`)
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
MONGODB_URI="mongodb://localhost:27017/auth_logs"
PORT=3000
```

Remote MongoDB example:

```env
MONGODB_URI="mongodb://USERNAME:PASSWORD@HOST:27017/auth_logs"
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

**MongoDB connection errors** — verify `MONGODB_URI` in `.env` and that MongoDB is running
