# Auth Service

NestJS authentication service with email/password signup, email verification, JWT access/refresh tokens (with rotation), session tracking, Google OAuth login, and protected routes.

**Default base URL:** `http://localhost:3302` (override with `PORT` in `.env`)

---

## Quick start

```bash
npm install
npm run prisma:generate
npm run prisma:migrate
npm run start:dev
```

---

## Environment variables

Set these in your local `.env` (never commit real values):

| Variable | Required for | Description |
|----------|--------------|-------------|
| `DATABASE_URL` | All DB operations | PostgreSQL connection string |
| `JWT_ACCESS_SECRET` | Login, refresh, `/me` | Signs access tokens (15m default) |
| `JWT_REFRESH_SECRET` | Login, refresh, logout | Signs refresh tokens (30d default) |
| `RESEND_API_KEY` | Signup email | Resend API key for verification emails |
| `GOOGLE_CLIENT_ID` | Google login | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth setup | Used for OAuth config (id-token verify uses client ID) |
| `PORT` | Server | HTTP port (default `3302`) |
| `RESEND_FROM` | Signup email | Sender address (optional) |
| `VERIFY_EMAIL_URL` | Signup email | Verification link base URL (optional) |
| `JWT_ACCESS_EXPIRES_IN` | Tokens | Access token TTL (optional, e.g. `1h`) |
| `JWT_REFRESH_EXPIRES_IN` | Tokens | Refresh token TTL (optional, e.g. `7d`) |

---

## API import (Postman / Insomnia)

Import the collection file:

```
docs/auth-service.postman_collection.json
```

**Postman:** Import → Upload Files → select the JSON above.

Collection variables:

| Variable | Purpose |
|----------|---------|
| `baseUrl` | `http://localhost:3302` |
| `accessToken` | Auto-set after login / refresh |
| `refreshToken` | Auto-set after login / refresh |
| `verificationToken` | Set manually from verification email |

---

## Auth flows

### Flow 1 — Email signup → verify → login

```
POST /auth/signup
       ↓
  (verification email sent)
       ↓
POST /auth/verify-email   ← token from email
       ↓
POST /auth/login
       ↓
GET  /auth/me             ← Bearer accessToken
```

### Flow 2 — Google login (no email verify)

```
POST /auth/google         ← Google idToken
       ↓
GET  /auth/me             ← Bearer accessToken
```

### Flow 3 — Token refresh (rotation)

```
POST /auth/refresh        ← refreshToken
       ↓
  { accessToken, refreshToken }   ← old refresh token is invalidated
```

### Flow 4 — Logout

```
POST /auth/logout         ← refreshToken
       ↓
  refresh token + linked session deleted
```

### Flow 5 — App startup (frontend)

```
Page load
    ↓
GET /auth/me   (Authorization: Bearer <accessToken>)
    ↓
200 → user logged in
401 → redirect to login or refresh
```

### Flow 6 — Update profile

```
GET /auth/me          ← get current profile
       ↓
PATCH /auth/me        ← update name, phone, countryCode, avatar
       ↓
GET /auth/me          ← confirm changes
```

---

## Endpoints reference

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `GET` | `/health` | No | Liveness check |
| `POST` | `/auth/signup` | No | Register with email/password |
| `POST` | `/auth/verify-email` | No | Confirm email with token |
| `POST` | `/auth/login` | No | Email/password login |
| `POST` | `/auth/google` | No | Google idToken login |
| `POST` | `/auth/refresh` | No | Rotate tokens |
| `POST` | `/auth/logout` | No | Revoke refresh token + session |
| `GET` | `/auth/me` | **Bearer access token** | Current user profile |
| `PATCH` | `/auth/me` | **Bearer access token** | Update profile fields |

---

## Request & response bodies

### `GET /health`

No body.

**Response `200`:**
```json
{ "status": "ok" }
```

---

### `POST /auth/signup`

**Requires:** `DATABASE_URL`, `RESEND_API_KEY`

**Request:**
```json
{
  "name": "Mohit Kumar",
  "email": "mohit@example.com",
  "password": "password123"
}
```

| Field | Type | Rules |
|-------|------|-------|
| `name` | string | 2–100 chars |
| `email` | string | Valid email, unique |
| `password` | string | 8–128 chars, stored as argon2 hash |

**Response `201`:**
```json
{
  "id": "uuid",
  "name": "Mohit Kumar",
  "email": "mohit@example.com",
  "role": "user",
  "isEmailVerified": false,
  "createdAt": "2026-05-30T..."
}
```

**Errors:** `400` user already exists

---

### `POST /auth/verify-email`

**Requires:** `DATABASE_URL`

**Request:**
```json
{
  "token": "550e8400-e29b-41d4-a716-446655440000"
}
```

| Field | Type | Rules |
|-------|------|-------|
| `token` | string | UUID from verification email |

**Response `200`:**
```json
{ "message": "Email verified successfully" }
```

**Errors:** `400` invalid or expired token

---

### `POST /auth/login`

**Requires:** `DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`

**Request (web):**
```json
{
  "email": "mohit@example.com",
  "password": "password123",
  "deviceType": "web",
  "deviceName": "Chrome"
}
```

**Request (mobile):**
```json
{
  "email": "mohit@example.com",
  "password": "password123",
  "deviceType": "mobile",
  "deviceName": "iPhone 15"
}
```

| Field | Type | Required | Rules |
|-------|------|----------|-------|
| `email` | string | Yes | Valid email |
| `password` | string | Yes | Plain text (verified against hash) |
| `deviceType` | string | No | `web` or `mobile` (default `web`) |
| `deviceName` | string | No | Default `Chrome` or `Mobile App` |

**Response `200`:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

Also creates: refresh token record (hashed) + session linked by `deviceId`.

**Errors:**
- `401` invalid credentials
- `400` email not verified

---

### `POST /auth/google`

**Requires:** `DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `GOOGLE_CLIENT_ID`

**Request:**
```json
{
  "idToken": "eyJhbGciOiRSUzI1NiIs...",
  "deviceType": "web",
  "deviceName": "Chrome"
}
```

| Field | Type | Required | Rules |
|-------|------|----------|-------|
| `idToken` | string | Yes | Google Sign-In **ID token** (not access token) |
| `deviceType` | string | No | `web` or `mobile` |
| `deviceName` | string | No | Device label |

**Response `200`:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

New users: `provider=google`, `isEmailVerified=true`, avatar from Google picture.

**Errors:** `401` invalid Google token

---

### `POST /auth/refresh`

**Requires:** `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `DATABASE_URL`

**Request:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response `200`:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Token rotation:** old refresh token is deleted; only the new one works (replay protection).

**Errors:** `401` invalid or expired refresh token

---

### `POST /auth/logout`

**Requires:** `JWT_REFRESH_SECRET`, `DATABASE_URL`

**Request:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response `200`:**
```json
{ "message": "Logged out successfully" }
```

Deletes the matching refresh token and its linked session.

**Errors:** `401` invalid refresh token

---

### `GET /auth/me`

**Requires:** `JWT_ACCESS_SECRET`

**Headers:**
```
Authorization: Bearer <accessToken>
```

No body.

**Response `200`:**
```json
{
  "id": "uuid",
  "name": "Mohit Kumar",
  "email": "mohit@example.com",
  "phone": null,
  "countryCode": null,
  "avatar": null,
  "role": "user",
  "isEmailVerified": true,
  "createdAt": "2026-05-30T...",
  "updatedAt": "2026-05-30T..."
}
```

**Errors:** `401 Unauthorized` — missing, expired, or invalid access token

---

### `PATCH /auth/me`

**Requires:** `JWT_ACCESS_SECRET`, `DATABASE_URL`

**Headers:**
```
Authorization: Bearer <accessToken>
Content-Type: application/json
```

**Request** (all fields optional — send only what you want to change):
```json
{
  "name": "Mohit Kumar",
  "phone": "9876543210",
  "countryCode": "+91",
  "avatar": "https://example.com/avatar.png"
}
```

| Field | Type | Rules |
|-------|------|-------|
| `name` | string | 2–100 chars |
| `phone` | string | Max 20 chars, unique |
| `countryCode` | string | Max 10 chars |
| `avatar` | string | Max 500 chars (URL) |

**Not updatable via this endpoint:** `email`, `password`, `role`, `provider`, `isEmailVerified`

**Response `200`:** Same shape as `GET /auth/me`

**Errors:**
- `401` invalid or missing access token
- `404` user not found
- `409` phone number already in use

---

## cURL examples

```bash
# Signup
curl -X POST http://localhost:3302/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"name":"Mohit","email":"mohit@example.com","password":"password123"}'

# Verify email
curl -X POST http://localhost:3302/auth/verify-email \
  -H "Content-Type: application/json" \
  -d '{"token":"YOUR_UUID_TOKEN"}'

# Login
curl -X POST http://localhost:3302/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"mohit@example.com","password":"password123","deviceType":"web"}'

# Google login
curl -X POST http://localhost:3302/auth/google \
  -H "Content-Type: application/json" \
  -d '{"idToken":"YOUR_GOOGLE_ID_TOKEN","deviceType":"web"}'

# Current user
curl http://localhost:3302/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Update profile
curl -X PATCH http://localhost:3302/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Mohit Kumar","phone":"9876543210","countryCode":"+91"}'

# Refresh
curl -X POST http://localhost:3302/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"YOUR_REFRESH_TOKEN"}'

# Logout
curl -X POST http://localhost:3302/auth/logout \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"YOUR_REFRESH_TOKEN"}'
```

---

## Project structure

```
auth-service/
├── src/
│   ├── auth/           # Controllers, DTOs, JWT, Google, guards
│   ├── users/          # User CRUD (Prisma)
│   ├── refresh-tokens/ # Hashed refresh token storage
│   ├── sessions/       # Device session tracking
│   ├── email/          # Resend verification emails
│   ├── prisma/         # Prisma client service
│   ├── config/         # App configuration
│   └── common/         # Health, decorators
├── db-schema/postgres/prisma/schema.prisma
├── docs/auth-service.postman_collection.json
├── prisma.config.ts
└── package.json
```

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run start:dev` | Dev server with watch |
| `npm run build` | Compile |
| `npm run prisma:generate` | Generate Prisma client |
| `npm run prisma:migrate` | Run migrations |
| `npm test` | Unit tests |

---

## Security notes

- Passwords and refresh tokens are **never stored in plain text** (argon2 hashes).
- Refresh tokens **rotate** on each `/auth/refresh` call.
- Signup response **excludes** password hash and verification token.
- Access tokens expire in **15 minutes**; refresh tokens in **30 days** (configurable via env).
- Google login verifies `idToken` against `GOOGLE_CLIENT_ID`.
