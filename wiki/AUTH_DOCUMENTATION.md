# Authentication Documentation

## Overview

The Forge backend implements a zero-knowledge authentication system where the server never sees user passwords. Authentication is based on client-side key derivation (PBKDF2) and server-side authkey verification (bcrypt). All data endpoints are protected and scoped to the authenticated user.

## Security Features

- **Zero-Knowledge Architecture**: Server never sees passwords, only derived authkeys
- **Client-Side Key Derivation**: PBKDF2 with 100,000 iterations and SHA-256
- **Authkey Hashing**: Derived authkeys are hashed using bcrypt with 10 salt rounds
- **HTTP-Only Cookies**: Session tokens are stored in secure HTTP-only cookies
- **Cookie Signing**: Session cookie values are HMAC-SHA256 signed using `COOKIE_SECRET`
- **User Isolation**: All data is scoped to individual users
- **Email as ID**: User email addresses serve as unique identifiers
- **Cryptographic Salt**: Each user has a unique, client-generated salt stored server-side

## Authentication Flow

### 1. Registration

**Endpoint**: `POST /api/auth/register`

**Client-Side Process**:

```typescript
// 1. Generate cryptographically secure random salt
const salt = generateSalt(); // 32 bytes, base64-encoded

// 2. Derive authkey from password + salt using PBKDF2
const authKeyObj = await deriveKey(password, salt, "authentication");
const authkey = await exportKeyToString(authKeyObj);

// 3. Send to server
const response = await fetch("/api/auth/register", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  credentials: "include",
  body: JSON.stringify({ email, authkey, salt }),
});
```

**Request Body**:

```json
{
  "email": "user@example.com",
  "authkey": "base64EncodedDerivedAuthkey==",
  "salt": "base64EncodedRandomSalt=="
}
```

**Requirements**:

- Email must be valid format
- Authkey must be provided (derived client-side from password)
- Salt must be provided (32-byte base64 string)
- Email must not already be registered

**Response** (201 Created):

```json
{
  "message": "User registered successfully",
  "user": {
    "email": "user@example.com",
    "createdAt": "2026-04-12T19:00:00.000Z"
  }
}
```

**What Happens Server-Side**:

1. Validates email format
2. Checks if user already exists
3. Hashes the authkey with bcrypt
4. Creates User record with authkeyHash
5. Creates UserSalt record with the client-provided salt
6. Sets session cookie (auto-login)

**Automatic Login**: Upon successful registration, a session cookie is automatically set.

### 2. Login

**Endpoint**: `POST /api/auth/login`

**Client-Side Process**:

```typescript
// 1. Fetch user's salt from public endpoint
const saltResponse = await fetch(
  `/api/salt?username=${encodeURIComponent(email)}`
);
const { salt } = await saltResponse.json();

// 2. Derive authkey from password + salt using PBKDF2
const authKeyObj = await deriveKey(password, salt, "authentication");
const authkey = await exportKeyToString(authKeyObj);

// 3. Send authkey to server
const response = await fetch("/api/auth/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  credentials: "include",
  body: JSON.stringify({ email, authkey }),
});
```

**Request Body**:

```json
{
  "email": "user@example.com",
  "authkey": "base64EncodedDerivedAuthkey=="
}
```

**Response** (200 OK):

```json
{
  "message": "Login successful",
  "user": {
    "email": "user@example.com",
    "createdAt": "2026-04-12T19:00:00.000Z"
  }
}
```

**Error Response** (401 Unauthorized):

```json
{
  "error": "Invalid email or authkey"
}
```

**What Happens Server-Side**:

1. Finds user by email
2. Verifies authkey against stored authkeyHash using bcrypt
3. Sets session cookie if valid
4. Returns user info

### 3. Get Salt (Public Endpoint)

**Endpoint**: `GET /api/salt?username=<email>`

**Purpose**: Allows clients to fetch a user's salt for key derivation during login.

**Request**:

```
GET /api/salt?username=user@example.com
```

**Response** (200 OK):

```json
{
  "salt": "base64EncodedSaltValue=="
}
```

**Error Response** (404 Not Found):

```json
{
  "error": "Salt not found"
}
```

**Security Note**: Salt values are not sensitive data. They are required for the client to derive the correct authkey during login. This endpoint is intentionally public.

### 4. Logout

**Endpoint**: `POST /api/auth/logout`

**Request**: No body required

**Response** (200 OK):

```json
{
  "message": "Logout successful"
}
```

### 5. Get Current User

**Endpoint**: `GET /api/auth/me`

**Request**: No body required (uses session cookie)

**Response** (200 OK):

```json
{
  "email": "user@example.com",
  "createdAt": "2026-04-12T19:00:00.000Z",
  "updatedAt": "2026-04-12T19:00:00.000Z"
}
```

**Error Response** (401 Unauthorized):

```json
{
  "error": "Not authenticated"
}
```

## Cryptographic Functions

### Client-Side (`lib/crypto/client.tsx`)

**`generateSalt(byteLength?: number): string`**

Generates a cryptographically secure random salt using the Web Crypto API.

```typescript
const salt = generateSalt(); // Returns 32-byte base64-encoded salt
const customSalt = generateSalt(64); // Returns 64-byte base64-encoded salt
```

**`deriveKey(password: string, salt: string, purpose: string, iterations?: number): Promise<CryptoKey>`**

Derives a cryptographic key from a password and salt using PBKDF2.

```typescript
const authKey = await deriveKey(password, salt, "authentication", 100000);
const encryptionKey = await deriveKey(password, salt, "encryption");
```

- Default iterations: 100,000
- Hash algorithm: SHA-256
- Output: AES-GCM 256-bit key

**`exportKeyToString(key: CryptoKey): Promise<string>`**

Exports a CryptoKey to a base64-encoded string for transmission.

```typescript
const authkey = await exportKeyToString(authKeyObj);
```

**`encrypt(key: CryptoKey, plaintext: string): Promise<string>`**

Encrypts plaintext using AES-GCM encryption.

```typescript
const ciphertext = await encrypt(encryptionKey, "secret data");
```

**`decrypt(key: CryptoKey, ciphertext: string): Promise<string>`**

Decrypts ciphertext that was encrypted with the encrypt function.

```typescript
const plaintext = await decrypt(encryptionKey, ciphertext);
```

### Server-Side (`lib/crypto/server.tsx`)

**`hashAuthkey(authkey: string): Promise<string>`**

Hashes an authkey using bcrypt with 10 rounds.

```typescript
const authkeyHash = await hashAuthkey(authkey);
```

**`verifyAuthkey(authkey: string, hash: string): Promise<boolean>`**

Verifies an authkey against a bcrypt hash.

```typescript
const isValid = await verifyAuthkey(authkey, storedHash);
```

## Protected Endpoints

All data endpoints require authentication:

### Goals API

- `GET /api/goals` — Returns only the authenticated user's goals
- `POST /api/goals` — Creates a goal for the authenticated user
- `GET /api/goals/:id` — Returns goal only if it belongs to the user
- `PUT /api/goals/:id` — Updates goal only if it belongs to the user
- `DELETE /api/goals/:id` — Deletes goal only if it belongs to the user

### Events API

- `GET /api/events` — Returns only the authenticated user's events
- `POST /api/events` — Creates an event for the authenticated user
- `GET /api/events/:id` — Returns event only if it belongs to the user
- `PATCH /api/events/:id` — Updates event only if it belongs to the user
- `DELETE /api/events/:id` — Deletes event only if it belongs to the user

### Providers API

- `GET /api/providers` — Returns only the authenticated user's AI providers
- `POST /api/providers` — Creates a provider for the authenticated user
- All provider and model endpoints verify ownership

### ICS Subscriptions API

- All ICS subscription endpoints are scoped to the authenticated user

## Session Management

**Cookie Name**: `session_user_email`

**Cookie Settings**:

- `httpOnly: true` — Cannot be accessed via JavaScript (XSS protection)
- `secure: true` (in production) — Only sent over HTTPS
- `sameSite: 'lax'` — CSRF protection
- `maxAge: 7 days` — Session expires after 7 days

**Cookie Signing**:

The cookie value (user email) is signed with HMAC-SHA256 using the `COOKIE_SECRET` environment variable before being stored. On every request the signature is verified using a timing-safe comparison; an invalid or tampered value is rejected as unauthenticated.

`COOKIE_SECRET` is **required** in all environments. Generate a strong secret with:

```bash
openssl rand -base64 32
```

## Testing Authentication

### Test User Credentials

The seed script creates a default test user:

- **Email**: `test@example.com`
- **Password**: `password123`

The test user's authkey is derived from the password using a stored salt.

### Using JavaScript/TypeScript

```typescript
// Get salt
const saltRes = await fetch(
  "http://localhost:3000/api/salt?username=test@example.com"
);
const { salt } = await saltRes.json();

// Derive authkey
const authKeyObj = await deriveKey("password123", salt, "authentication");
const authkey = await exportKeyToString(authKeyObj);

// Login
const loginRes = await fetch("http://localhost:3000/api/auth/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  credentials: "include",
  body: JSON.stringify({ email: "test@example.com", authkey }),
});
```

### Using curl (Simplified)

Note: curl examples require pre-computed authkeys. For actual implementation, use the client-side JavaScript functions.

```bash
# Get user's salt (public endpoint)
curl http://localhost:3000/api/salt?username=test@example.com

# Get current user (with cookie)
curl http://localhost:3000/api/auth/me -b cookies.txt

# Fetch goals (authenticated)
curl http://localhost:3000/api/goals -b cookies.txt

# Try without auth (should return 401)
curl http://localhost:3000/api/goals

# Logout
curl -X POST http://localhost:3000/api/auth/logout -b cookies.txt
```

## Error Responses

### 401 Unauthorized

Returned when authentication is required but not provided:

```json
{
  "error": "Authentication required"
}
```

Or when credentials are invalid:

```json
{
  "error": "Invalid email or authkey"
}
```

### 404 Not Found

Returned when trying to access another user's resource:

```json
{
  "error": "Goal not found"
}
```

Or when salt is not found:

```json
{
  "error": "Salt not found"
}
```

### 409 Conflict

Returned when trying to register with an existing email:

```json
{
  "error": "User with this email already exists"
}
```

### 400 Bad Request

Returned for validation errors:

```json
{
  "error": "Email, authkey, and salt are required"
}
```

```json
{
  "error": "Invalid email format"
}
```

## Database Schema

### User Table

```prisma
model User {
  id            String          @id // email address
  authkeyHash   String          // bcrypt hash of derived authkey
  timezone      String          @default("UTC")
  createdAt     DateTime        @default(now())
  updatedAt     DateTime        @updatedAt

  goals            Goal[]
  events           Event[]
  providers        Provider[]
  chatHistories    ChatHistory[]
  icsSubscriptions IcsSubscription[]
  memories         Memory[]
  searchConfig     SearchConfig?
  salts            UserSalt[]
}
```

### UserSalt Table

```prisma
model UserSalt {
  id        String   @id @default(uuid())
  userId    String   @unique // One salt per user
  salt      String   // Base64-encoded salt value
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

### Goal Table

```prisma
model Goal {
  id            String          @id @default(uuid())
  userId        String
  title         String
  description   String
  dueDate       DateTime?
  chatHistoryId String?         @unique
  createdAt     DateTime        @default(now())
  updatedAt     DateTime        @updatedAt

  user          User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  chatHistory   ChatHistory?    @relation(fields: [chatHistoryId], references: [id], onDelete: SetNull)
  events        Event[]
  infoTags      InfoTag[]

  @@index([userId])
}
```

### Event Table (Unified)

```prisma
model Event {
  id              String   @id @default(uuid())
  userId          String
  goalId          String?  // nullable — links to Goal if it's a goal task
  title           String
  start           DateTime // UTC datetime
  end             DateTime // UTC datetime
  kind            String?  // 'task', 'break', 'ics', etc.
  completed       Boolean  @default(false)
  confirmed       Boolean  @default(true)
  minutesEstimate Int?
  order           Int      @default(0)
  metadata        String?  // JSON string for extensibility

  // ICS-specific fields (nullable for user-created events)
  subscriptionId   String?
  uid              String?
  recurid          String   @default("")
  description      String?
  location         String?
  // ... additional ICS fields

  user             User              @relation(fields: [userId], references: [id], onDelete: Cascade)
  goal             Goal?             @relation(fields: [goalId], references: [id], onDelete: Cascade)
  subscription     IcsSubscription?  @relation(fields: [subscriptionId], references: [id], onDelete: Cascade)

  @@unique([subscriptionId, uid, recurid])
  @@index([userId])
  @@index([goalId])
  @@index([subscriptionId])
}
```

## Implementation Details

### Zero-Knowledge Architecture

The system implements a zero-knowledge architecture where:

1. **Client generates salt** during registration (never known by server beforehand)
2. **Client derives authkey** from password + salt using PBKDF2 (100,000 iterations)
3. **Server stores authkeyHash** (bcrypt) and salt (plaintext)
4. **Server never sees password** at any point

This ensures that:

- Server compromise doesn't reveal passwords
- Server cannot derive encryption keys
- Users can derive multiple keys for different purposes (encryption, signing, etc.)

### Authkey Derivation

```typescript
// Purpose: "authentication" for login
// Iterations: 100,000 (PBKDF2)
// Hash: SHA-256
// Output: 256-bit AES-GCM key

const authKeyObj = await deriveKey(password, salt, "authentication", 100000);
```

Different purposes can be used to derive different keys from the same password:

- `"authentication"` — For login authkey
- `"encryption"` — For data encryption
- `"signing"` — For digital signatures

### Authkey Security

- Uses bcryptjs library (v3.x) for secure authkey hashing
- 10 salt rounds (2^10 = 1,024 iterations)
- Authkeys are never stored in plain text
- Authkeys are never returned in API responses

### Authentication Middleware

Located in `lib/auth.ts`:

- `setAuthCookie(email)` — Sets the session cookie
- `clearAuthCookie()` — Clears the session cookie
- `getCurrentUser()` — Gets the current authenticated user's email
- `requireAuth()` — Throws error if not authenticated (used in protected routes)

### Route Protection Pattern

All protected routes follow this pattern:

```typescript
export async function GET(req: Request) {
  try {
    const userId = await requireAuth();
    // ... route logic using userId
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }
    // ... other error handling
  }
}
```

## Security Best Practices

1. **Set COOKIE_SECRET**: Generate a strong random secret (`openssl rand -base64 32`) and set it as the `COOKIE_SECRET` environment variable. The application will refuse to start without it.
2. **Use HTTPS in Production**: Set `NODE_ENV=production` to enable secure cookies
3. **Implement Rate Limiting**: Add rate limiting to prevent brute force attacks on login
4. **Monitor Salt Endpoint**: While public, monitor for abuse (e.g., enumeration attacks)
5. **Client-Side Validation**: Validate password strength before deriving authkey
6. **Secure Salt Storage**: Ensure client stores salt securely during registration
7. **Key Derivation Time**: Inform users that login may take a moment (PBKDF2 iterations)
8. **Add 2FA**: Consider adding two-factor authentication for enhanced security

## Frontend Integration

### Registration Flow

```typescript
import {
  generateSalt,
  deriveKey,
  exportKeyToString,
} from "@/lib/crypto/client";

async function register(email: string, password: string) {
  // 1. Generate salt
  const salt = generateSalt();

  // 2. Derive authkey
  const authKeyObj = await deriveKey(password, salt, "authentication");
  const authkey = await exportKeyToString(authKeyObj);

  // 3. Send to server
  const response = await fetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email, authkey, salt }),
  });

  return response.json();
}
```

### Login Flow

```typescript
import { deriveKey, exportKeyToString } from "@/lib/crypto/client";

async function login(email: string, password: string) {
  // 1. Fetch salt
  const saltRes = await fetch(
    `/api/salt?username=${encodeURIComponent(email)}`
  );

  if (!saltRes.ok) {
    throw new Error("User not found");
  }

  const { salt } = await saltRes.json();

  // 2. Derive authkey
  const authKeyObj = await deriveKey(password, salt, "authentication");
  const authkey = await exportKeyToString(authKeyObj);

  // 3. Send to server
  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email, authkey }),
  });

  return response.json();
}
```

### Fetch Protected Data

```typescript
// Always include credentials to send cookies
const goals = await fetch("/api/goals", {
  credentials: "include",
});
```

### Handle 401 Errors

```typescript
const response = await fetch("/api/goals", {
  credentials: "include",
});

if (response.status === 401) {
  // Redirect to login
  window.location.href = "/login";
}
```

### Check Authentication Status

```typescript
async function checkAuth() {
  const response = await fetch("/api/auth/me", {
    credentials: "include",
  });

  if (response.ok) {
    const user = await response.json();
    return user;
  }

  return null;
}
```

## Performance Considerations

- **PBKDF2 Computation**: Key derivation takes ~100-200ms on modern devices (intentional for security)
- **Show Loading State**: Display loading indicators during login/registration
- **Salt Caching**: Consider caching salt client-side after first fetch (only for UX, not security)
- **Parallel Requests**: Salt fetch and UI prep can happen in parallel

## Migration from Password-Based Auth

If migrating from a password-based system:

1. Create migration script to generate salts for existing users
2. Derive authkeys from existing passwords (requires one-time password knowledge)
3. Hash authkeys with bcrypt
4. Store salts in UserSalt table
5. Update User table schema (passwordHash → authkeyHash)
6. Update client code to use new auth flow
