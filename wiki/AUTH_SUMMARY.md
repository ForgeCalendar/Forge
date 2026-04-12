# Authentication Implementation Summary

## What Was Added

Complete zero-knowledge user authentication system with client-side key derivation and secure authkey storage.

### 1. Database Layer

**User Model** (`prisma/schema.prisma`):

- Email as unique identifier (primary key)
- Bcrypt-hashed authkey storage (derived from password + salt)
- Relationships to Goals, Events, Providers, ChatHistories, IcsSubscriptions, and UserSalt
- Automatic timestamps (createdAt, updatedAt)

**UserSalt Model** (`prisma/schema.prisma`):

- One salt per user (unique userId constraint)
- Client-generated cryptographically secure random salt
- Base64-encoded 32-byte salt value
- Used for client-side key derivation

**Updated Models**:

- `Goal` — Added `userId` foreign key with cascade delete
- `Event` — Unified model with `userId` foreign key

**Migrations**: Database schema versioned through migrations in `prisma/migrations/`

### 2. Cryptography Library

**Client-Side** (`lib/crypto/client.tsx`):

- `generateSalt(byteLength?)` — Generate cryptographically secure random salt (Web Crypto API)
- `deriveKey(password, salt, purpose, iterations?)` — PBKDF2 key derivation (100,000 iterations, SHA-256)
- `exportKeyToString(key)` — Export CryptoKey to base64 string
- `encrypt(key, plaintext)` — AES-GCM encryption
- `decrypt(key, ciphertext)` — AES-GCM decryption

**Server-Side** (`lib/crypto/server.tsx`):

- `hashAuthkey(authkey)` — Hash authkeys with bcrypt (10 salt rounds)
- `verifyAuthkey(authkey, hash)` — Verify authkeys

**Authentication Library** (`lib/auth.ts`):

- `setAuthCookie(email)` — Create HTTP-only session cookie (7 day expiry)
- `clearAuthCookie()` — Remove session cookie
- `getCurrentUser()` — Get authenticated user's email from cookie
- `requireAuth()` — Middleware to enforce authentication

### 3. Authentication API Routes

**Registration** — `POST /api/auth/register`

Request:

```json
{
  "email": "user@example.com",
  "authkey": "base64EncodedDerivedKey==",
  "salt": "base64EncodedRandomSalt=="
}
```

Flow:

1. Client generates random salt (32 bytes)
2. Client derives authkey from password + salt using PBKDF2
3. Server validates email format
4. Server hashes authkey with bcrypt
5. Server creates User + UserSalt in transaction
6. Auto-logs in user after registration

**Login** — `POST /api/auth/login`

Request:

```json
{
  "email": "user@example.com",
  "authkey": "base64EncodedDerivedKey=="
}
```

Flow:

1. Client fetches user's salt from `/api/salt?username=email`
2. Client derives authkey from password + salt using PBKDF2
3. Server verifies authkey against stored authkeyHash
4. Sets secure HTTP-only session cookie
5. Returns user info (email, createdAt)

**Get Salt** — `GET /api/salt?username=<email>` (PUBLIC)

- Returns user's salt for client-side key derivation
- Required for login flow
- No authentication needed

**Logout** — `POST /api/auth/logout`

- Clears session cookie
- Simple and secure logout

**Current User** — `GET /api/auth/me`

- Returns authenticated user's info
- Used for checking auth status

### 4. Protected Data Endpoints

All existing endpoints require authentication:

**Goals API** (`/api/goals/*`):

- ✅ Filters goals by authenticated user
- ✅ Creates goals associated with user
- ✅ Verifies ownership before update/delete
- ✅ Returns 401 if not authenticated
- ✅ Returns 404 if accessing another user's goal

**Events API** (`/api/events/*`):

- ✅ Filters events by authenticated user
- ✅ Creates events associated with user
- ✅ Verifies ownership before update/delete
- ✅ Returns 401 if not authenticated
- ✅ Returns 404 if accessing another user's event

**Providers API** (`/api/providers/*`):

- ✅ Scoped to authenticated user

**ICS Subscriptions API** (`/api/ics-subscriptions/*`):

- ✅ Scoped to authenticated user

### 5. Seed Data

**Updated Seed Script** (`prisma/seed.ts`):

- Creates test user with derived authkey
- Associates all sample goals with test user
- Associates all sample events with test user
- Creates AI provider configurations from environment variables
- Clears users table on reseed

### 6. Documentation

**AUTH_DOCUMENTATION.md**:

- Complete authentication guide with zero-knowledge flow
- API endpoint reference with examples
- Security features explanation
- curl command examples for testing
- Frontend integration instructions
- Database schema details
- Security best practices

## Security Features

✅ **Zero-Knowledge Architecture**:

- Server never sees user passwords
- Client-side key derivation using PBKDF2
- 100,000 iterations with SHA-256 hash
- Authkey derived from password + salt

✅ **Authkey Security**:

- Bcrypt hashing with 10 salt rounds
- Authkeys never stored in plain text
- Authkeys never returned in API responses
- Each user has unique salt

✅ **Cryptographic Security**:

- Client-side salt generation (Web Crypto API)
- PBKDF2 for key derivation (industry standard)
- AES-GCM encryption support (256-bit keys)
- Base64 encoding for transport

✅ **Session Security**:

- HTTP-only cookies (JavaScript cannot access)
- Secure flag in production (HTTPS only)
- SameSite protection (CSRF prevention)
- HMAC-SHA256 cookie signing via `COOKIE_SECRET` (tamper prevention)
- 7-day expiration

✅ **Data Isolation**:

- All data scoped to user
- Database-level foreign key constraints
- Cascade delete (delete user = delete all their data)
- Ownership verification on all mutations

✅ **API Security**:

- 401 Unauthorized for missing auth
- 404 Not Found for unauthorized resource access
- Input validation (email format)
- Proper error messages without leaking info
- Public salt endpoint (required for login)

## Client-Side Authentication Flow

### Registration

```typescript
// 1. Generate random salt
const salt = generateSalt(); // 32 bytes, base64-encoded

// 2. Derive authkey from password + salt
const authKeyObj = await deriveKey(password, salt, "authentication");
const authkey = await exportKeyToString(authKeyObj);

// 3. Send to server
await fetch("/api/auth/register", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email, authkey, salt }),
});
```

### Login

```typescript
// 1. Fetch user's salt
const { salt } = await fetch(`/api/salt?username=${email}`).then((r) =>
  r.json()
);

// 2. Derive authkey from password + salt
const authKeyObj = await deriveKey(password, salt, "authentication");
const authkey = await exportKeyToString(authKeyObj);

// 3. Send to server
await fetch("/api/auth/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email, authkey }),
});
```

## Testing

### Test Credentials

```
Email: test@example.com
Password: password123
```

Note: The test user's authkey is derived from the password using the stored salt.

### Quick Test Commands

```bash
# Get user's salt
curl http://localhost:3000/api/salt?username=test@example.com

# Note: For actual login/register, you need to derive the authkey client-side
# The curl examples below are simplified - actual implementation requires
# PBKDF2 key derivation in the client

# Check authentication
curl http://localhost:3000/api/auth/me -b cookies.txt

# Fetch user's goals (should return sample goals)
curl http://localhost:3000/api/goals -b cookies.txt

# Try without auth (should return 401)
curl http://localhost:3000/api/goals

# Logout
curl -X POST http://localhost:3000/api/auth/logout -b cookies.txt
```

## Key Files

**Cryptography Files**:

- `lib/crypto/client.tsx` — Client-side crypto (salt generation, key derivation, encryption)
- `lib/crypto/server.tsx` — Server-side crypto (authkey hashing)

**Authentication Files**:

- `lib/auth.ts` — Authentication utilities (session management)
- `app/api/auth/register/route.ts` — User registration
- `app/api/auth/login/route.ts` — User login
- `app/api/auth/logout/route.ts` — User logout
- `app/api/auth/me/route.ts` — Get current user
- `app/api/salt/route.ts` — Get user salt (public)

**Frontend Components**:

- `components/RegisterDialog.tsx` — Registration with client-side key derivation
- `components/LoginDialog.tsx` — Login with salt fetch and key derivation

**Protected Route Files**:

- `app/api/goals/route.ts` — Goals list/create with user filtering
- `app/api/goals/[id]/route.ts` — Goal CRUD with ownership verification
- `app/api/events/route.ts` — Events list/create with user filtering
- `app/api/events/[id]/route.ts` — Event CRUD with ownership verification
- `app/api/providers/route.ts` — Providers with user filtering
- `app/api/ics-subscriptions/route.ts` — ICS subscriptions with user filtering

## Dependencies

```json
{
  "dependencies": {
    "bcryptjs": "^3.0.3"
  },
  "devDependencies": {
    "@types/bcryptjs": "^2.4.6"
  }
}
```

Note: Web Crypto API is built into modern browsers (no additional dependencies needed for client-side crypto).

## Architecture Decisions

1. **Zero-Knowledge Design**: Server never sees passwords, only derived authkeys
2. **Client-Side Key Derivation**: PBKDF2 with 100,000 iterations for strong key derivation
3. **Email as Primary Key**: Simplified design, email is naturally unique
4. **HTTP-Only Cookies**: More secure than localStorage for web apps
5. **Session-Based Auth**: Simple, no JWT complexity for single-server setup
6. **Bcrypt for Authkeys**: Industry standard for hashing
7. **HMAC-SHA256 Cookie Signing**: Signed cookie values (`COOKIE_SECRET`) prevent client-side tampering
8. **Public Salt Endpoint**: Required for login flow (not sensitive data)
9. **Single Salt Per User**: Simplified model, one salt used for all purposes
10. **Ownership Verification**: Database queries filter by userId to prevent data leaks
11. **Cascade Delete**: Automatic cleanup when user is deleted

## API Endpoint Summary

**Public Endpoints** (no auth required):

- `POST /api/auth/register` — Register new user (requires authkey + salt)
- `POST /api/auth/login` — Login user (requires authkey)
- `GET /api/salt?username=<email>` — Get user's salt for key derivation

**Authenticated Endpoints** (session cookie required):

- `POST /api/auth/logout` — Logout user
- `GET /api/auth/me` — Get current user
- `GET /api/goals` — List user's goals
- `POST /api/goals` — Create goal
- `GET /api/goals/:id` — Get specific goal
- `PUT /api/goals/:id` — Update goal
- `DELETE /api/goals/:id` — Delete goal
- `GET /api/events` — List user's events
- `POST /api/events` — Create event
- `GET /api/events/:id` — Get specific event
- `PATCH /api/events/:id` — Update event
- `DELETE /api/events/:id` — Delete event
- `GET /api/providers` — List AI providers
- `POST /api/providers` — Create provider
- `GET /api/ics-subscriptions` — List ICS subscriptions
- `POST /api/ics-subscriptions` — Create subscription
