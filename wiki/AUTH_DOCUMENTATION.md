# Authentication Documentation

## Overview

The Vibe Kanban backend now includes secure user authentication with email-based login and bcrypt password hashing. All data endpoints are protected and scoped to the authenticated user.

## Security Features

- **Password Hashing**: Passwords are hashed using bcrypt with 10 salt rounds
- **HTTP-Only Cookies**: Session tokens are stored in secure HTTP-only cookies
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

All data endpoints now require authentication:

### Goals API

- `GET /api/goals` - Returns only the authenticated user's goals
- `POST /api/goals` - Creates a goal for the authenticated user
- `GET /api/goals/:id` - Returns goal only if it belongs to the user
- `PUT /api/goals/:id` - Updates goal only if it belongs to the user
- `DELETE /api/goals/:id` - Deletes goal only if it belongs to the user

### Events API

- `GET /api/events` - Returns only the authenticated user's events
- `POST /api/events` - Creates an event for the authenticated user
- `GET /api/events/:id` - Returns event only if it belongs to the user
- `PATCH /api/events/:id` - Updates event only if it belongs to the user
- `DELETE /api/events/:id` - Deletes event only if it belongs to the user

### Events API

- `PATCH /api/events/:id` - Updates event (verified through parent goal)
- `DELETE /api/events/:id` - Deletes event (verified through parent goal)

## Session Management

**Cookie Name**: `session_user_email`

**Cookie Settings**:

- `httpOnly: true` - Cannot be accessed via JavaScript (XSS protection)
- `secure: true` (in production) - Only sent over HTTPS
- `sameSite: 'lax'` - CSRF protection
- `maxAge: 7 days` - Session expires after 7 days

## Testing Authentication

### Using curl

```bash
# Register a new user
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}' \
  -c cookies.txt

# Login (saves session cookie)
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}' \
  -c cookies.txt

# Get current user (uses saved cookie)
curl http://localhost:3001/api/auth/me -b cookies.txt

# Fetch goals (authenticated)
curl http://localhost:3001/api/goals -b cookies.txt

# Create a goal (authenticated)
curl -X POST http://localhost:3001/api/goals \
  -H "Content-Type: application/json" \
  -d '{"title":"My Goal","description":"Test goal","dueDate":null,"events":[],"infoTags":[]}' \
  -b cookies.txt

# Logout
curl -X POST http://localhost:3001/api/auth/logout -b cookies.txt
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

  goals         Goal[]
  calendarEvents CalendarEvent[]
}
```

### Modified Goal Table

```prisma
model Goal {
  id           String        @id @default(uuid())
  userId       String        // NEW: Links to User
  title        String
  description  String
  dueDate      String?
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt

  user         User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  events Event[]
  infoTags     InfoTag[]

  @@index([userId])
}
```

### Modified CalendarEvent Table

```prisma
model CalendarEvent {
  id        String   @id @default(uuid())
  userId    String   // NEW: Links to User
  title     String
  start     String
  end       String
  kind      String?
  metadata  String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
}
```

## Implementation Details

### Password Security

- Uses bcryptjs library for secure password hashing
- 10 salt rounds (2^10 = 1,024 iterations)
- Passwords are never stored in plain text
- Passwords are never returned in API responses

### Authentication Middleware

Located in `lib/auth.ts`:

- `hashPassword(password)` - Hashes a password
- `verifyPassword(password, hash)` - Verifies a password against its hash
- `setAuthCookie(email)` - Sets the session cookie
- `clearAuthCookie()` - Clears the session cookie
- `getCurrentUser()` - Gets the current authenticated user's email
- `requireAuth()` - Throws error if not authenticated (used in protected routes)

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

## Migration from Previous Version

If you had data before adding authentication:

1. The previous database will be recreated (existing data cleared)
2. Run `npm run db:seed` to populate with test data
3. Use the test credentials to access the seeded data

To preserve existing data, you would need to:

1. Export existing data before migration
2. Create a user account
3. Associate all data with that user's ID
4. Re-import the data

## Security Best Practices

1. **Use HTTPS in Production**: Set `NODE_ENV=production` to enable secure cookies
2. **Change Test Credentials**: Update the test user password in production
3. **Implement Rate Limiting**: Add rate limiting to prevent brute force attacks
4. **Add Password Requirements**: Consider enforcing stronger password policies
5. **Implement Email Verification**: Add email verification for new registrations
6. **Add Refresh Tokens**: Implement refresh tokens for longer sessions
7. **Add 2FA**: Consider adding two-factor authentication for enhanced security

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
