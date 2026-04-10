# Authentication Documentation

## Overview

The Forge backend includes secure user authentication with email-based login and bcrypt password hashing. All data endpoints are protected and scoped to the authenticated user.

## Security Features

- **Password Hashing**: Passwords are hashed using bcrypt with 10 salt rounds
- **HTTP-Only Cookies**: Session tokens are stored in secure HTTP-only cookies
- **Cookie Signing**: Session cookie values are HMAC-SHA256 signed using `COOKIE_SECRET` to prevent tampering
- **User Isolation**: All goals and events are scoped to individual users
- **Email as ID**: User email addresses serve as unique identifiers

## Authentication Flow

### 1. Registration

**Endpoint**: `POST /api/auth/register`

**Request Body**:

```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Requirements**:

- Email must be valid format
- Password must be at least 8 characters
- Email must not already be registered

**Response** (201 Created):

```json
{
  "message": "User registered successfully",
  "user": {
    "email": "user@example.com",
    "createdAt": "2026-01-15T18:00:00.000Z"
  }
}
```

**Automatic Login**: Upon successful registration, a session cookie is automatically set.

### 2. Login

**Endpoint**: `POST /api/auth/login`

**Request Body**:

```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Response** (200 OK):

```json
{
  "message": "Login successful",
  "user": {
    "email": "user@example.com",
    "createdAt": "2026-01-15T18:00:00.000Z"
  }
}
```

**Error Response** (401 Unauthorized):

```json
{
  "error": "Invalid email or password"
}
```

### 3. Logout

**Endpoint**: `POST /api/auth/logout`

**Request**: No body required

**Response** (200 OK):

```json
{
  "message": "Logout successful"
}
```

### 4. Get Current User

**Endpoint**: `GET /api/auth/me`

**Request**: No body required (uses session cookie)

**Response** (200 OK):

```json
{
  "email": "user@example.com",
  "createdAt": "2026-01-15T18:00:00.000Z",
  "updatedAt": "2026-01-15T18:00:00.000Z"
}
```

**Error Response** (401 Unauthorized):

```json
{
  "error": "Not authenticated"
}
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

### Using curl

```bash
# Register a new user
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}' \
  -c cookies.txt

# Login (saves session cookie)
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}' \
  -c cookies.txt

# Get current user (uses saved cookie)
curl http://localhost:3000/api/auth/me -b cookies.txt

# Fetch goals (authenticated)
curl http://localhost:3000/api/goals -b cookies.txt

# Create a goal (authenticated)
curl -X POST http://localhost:3000/api/goals \
  -H "Content-Type: application/json" \
  -d '{"title":"My Goal","description":"Test goal","dueDate":null}' \
  -b cookies.txt

# Logout
curl -X POST http://localhost:3000/api/auth/logout -b cookies.txt
```

### Test User Credentials

The seed script creates a default test user:

- **Email**: `test@example.com`
- **Password**: `password123`

## Error Responses

### 401 Unauthorized

Returned when authentication is required but not provided:

```json
{
  "error": "Authentication required"
}
```

### 404 Not Found

Returned when trying to access another user's resource:

```json
{
  "error": "Goal not found"
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
  "error": "Password must be at least 8 characters long"
}
```

## Database Schema

### User Table

```prisma
model User {
  id            String          @id // email address
  passwordHash  String
  createdAt     DateTime        @default(now())
  updatedAt     DateTime        @updatedAt

  goals            Goal[]
  events           Event[]
  providers        Provider[]
  chatHistories    ChatHistory[]
  icsSubscriptions IcsSubscription[]
}
```

### Goal Table

```prisma
model Goal {
  id            String          @id @default(uuid())
  userId        String
  title         String
  description   String
  dueDate       String?
  chatHistoryId String?         @unique
  createdAt     DateTime        @default(now())
  updatedAt     DateTime        @updatedAt

  user          User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  chatHistory   ChatHistory?    @relation(fields: [chatHistoryId], references: [id], onDelete: SetNull)
  events        Event[]

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
  start           String   // ISO datetime string
  end             String   // ISO datetime string
  kind            String?  // 'task', 'break', 'ics', etc.
  completed       Boolean  @default(false)
  minutesEstimate Int?
  order           Int      @default(0)
  metadata        String?  // JSON string for extensibility

  // ICS-specific fields (nullable for user-created events)
  subscriptionId   String?
  uid              String?
  description      String?
  location         String?
  // ... additional ICS fields

  user             User              @relation(fields: [userId], references: [id], onDelete: Cascade)
  goal             Goal?             @relation(fields: [goalId], references: [id], onDelete: Cascade)
  subscription     IcsSubscription?  @relation(fields: [subscriptionId], references: [id], onDelete: Cascade)

  @@unique([subscriptionId, uid])
  @@index([userId])
  @@index([goalId])
  @@index([subscriptionId])
}
```

## Implementation Details

### Password Security

- Uses bcryptjs library (v3.x) for secure password hashing
- 10 salt rounds (2^10 = 1,024 iterations)
- Passwords are never stored in plain text
- Passwords are never returned in API responses

### Authentication Middleware

Located in `lib/auth.ts`:

- `hashPassword(password)` — Hashes a password
- `verifyPassword(password, hash)` — Verifies a password against its hash
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
3. **Change Test Credentials**: Update the test user password in production
4. **Implement Rate Limiting**: Add rate limiting to prevent brute force attacks
5. **Add Password Requirements**: Consider enforcing stronger password policies
6. **Implement Email Verification**: Add email verification for new registrations
7. **Add Refresh Tokens**: Implement refresh tokens for longer sessions
8. **Add 2FA**: Consider adding two-factor authentication for enhanced security

## Frontend Integration

To integrate with your React frontend:

1. Create login/register forms
2. Store authentication state in React context or global state
3. Include credentials in fetch requests:

```javascript
// Login
const response = await fetch("/api/auth/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  credentials: "include", // Important: includes cookies
  body: JSON.stringify({ email, password }),
});

// Fetch protected data
const goals = await fetch("/api/goals", {
  credentials: "include", // Important: includes cookies
});
```

4. Handle 401 errors by redirecting to login page
5. Check authentication status on app load with `/api/auth/me`
