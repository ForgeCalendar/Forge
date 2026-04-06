# Forge Backend API Documentation

This document describes the REST API endpoints for the Forge application backend.

## Base URL

All API endpoints are prefixed with `/api`

## Database Setup

### Initial Setup

```bash
# Install dependencies
npm install

# Run migrations to create database tables
npm run db:init

# Seed the database with sample data
npm run db:seed
```

### Database Schema

The backend uses SQLite with Prisma ORM. The database includes:

- **User**: Authenticated users (email as primary key)
- **Goal**: Main planning entities with title, description, and due dates
- **Event**: Unified event model for both goal tasks and calendar events
- **Provider**: AI provider configurations (Anthropic, OpenAI, Google, Mistral)
- **AIModel**: AI models associated with providers
- **ChatHistory**: Conversation history per goal
- **Message**: Individual messages within chat histories
- **IcsSubscription**: External ICS calendar subscriptions

## API Endpoints

### Authentication

#### POST /api/auth/register

Register a new user.

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

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

#### POST /api/auth/login

Login an existing user.

**Request Body:**

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

#### POST /api/auth/logout

Logout the current user. No request body required.

**Response** (200 OK):

```json
{
  "message": "Logout successful"
}
```

#### GET /api/auth/me

Get the current authenticated user.

**Response** (200 OK):

```json
{
  "email": "user@example.com",
  "createdAt": "2026-01-15T18:00:00.000Z",
  "updatedAt": "2026-01-15T18:00:00.000Z"
}
```

### Goals

All goals endpoints require authentication.

#### GET /api/goals

Get all goals for the authenticated user, with their events.

**Response:**

```json
[
  {
    "id": "uuid",
    "userId": "user@example.com",
    "title": "Goal title",
    "description": "Goal description",
    "dueDate": "2026-01-15T17:00:00",
    "chatHistoryId": "uuid",
    "createdAt": "2026-01-15T18:00:00.000Z",
    "updatedAt": "2026-01-15T18:00:00.000Z",
    "events": [
      {
        "id": "uuid",
        "userId": "user@example.com",
        "goalId": "uuid",
        "title": "Event title",
        "start": "2026-01-15T09:00:00.000Z",
        "end": "2026-01-15T10:00:00.000Z",
        "kind": "task",
        "completed": false,
        "minutesEstimate": 30,
        "order": 0
      }
    ]
  }
]
```

#### POST /api/goals

Create a new goal.

**Request Body:**

```json
{
  "title": "Goal title",
  "description": "Goal description",
  "dueDate": "2026-01-15T17:00:00"
}
```

**Response** (201 Created): Returns the created goal with all nested data.

#### GET /api/goals/:id

Get a specific goal by ID.

**Response:** Returns a single goal object (same structure as GET /api/goals items).

#### PUT /api/goals/:id

Update a goal. Replaces all events.

**Request Body:**

```json
{
  "title": "Goal title",
  "description": "Goal description",
  "dueDate": "2026-01-15T17:00:00",
  "events": [
    {
      "title": "Event title",
      "start": "2026-01-15T09:00:00",
      "end": "2026-01-15T10:00:00",
      "completed": false,
      "minutesEstimate": 30
    }
  ]
}
```

**Response:** Returns the updated goal with all nested data.

#### DELETE /api/goals/:id

Delete a goal (cascades to events).

**Response:**

```json
{
  "message": "Goal deleted successfully"
}
```

### Events

All events endpoints require authentication. The Event model is unified — it serves both as goal tasks (linked via `goalId`) and standalone calendar events.

#### GET /api/events

Get all events for the authenticated user.

**Response:**

```json
[
  {
    "id": "uuid",
    "title": "Event title",
    "start": "2026-01-15T09:00:00.000Z",
    "end": "2026-01-15T10:00:00.000Z",
    "extendedProps": {
      "kind": "task"
    }
  }
]
```

The response format is compatible with FullCalendar.

#### POST /api/events

Create a new event.

**Request Body:**

```json
{
  "title": "Event title",
  "start": "2026-01-15T09:00:00",
  "end": "2026-01-15T10:00:00",
  "kind": "task",
  "goalId": "uuid",
  "completed": false,
  "minutesEstimate": 30,
  "metadata": {
    "customField": "value"
  }
}
```

All fields except `title`, `start`, and `end` are optional.

**Response** (201 Created): Returns the created event.

#### GET /api/events/:id

Get a specific event by ID.

**Response:** Returns a single event object.

#### PATCH /api/events/:id

Update an event (useful for drag-and-drop rescheduling or toggling completion).

**Request Body:**

```json
{
  "title": "Updated title",
  "start": "2026-01-15T10:00:00",
  "end": "2026-01-15T11:00:00",
  "kind": "break",
  "completed": true,
  "minutesEstimate": 45,
  "metadata": {
    "customField": "new value"
  }
}
```

All fields are optional. Only provided fields will be updated.

**Response:** Returns the updated event.

#### DELETE /api/events/:id

Delete an event.

**Response:**

```json
{
  "message": "Event deleted successfully"
}
```

### Providers

Manage AI provider configurations. All endpoints require authentication.

- `GET /api/providers` — List all providers for the authenticated user
- `POST /api/providers` — Create a new provider configuration
- `GET /api/providers/:id` — Get a specific provider
- `PUT /api/providers/:id` — Update a provider
- `DELETE /api/providers/:id` — Delete a provider

### Provider Models

Manage AI models within a provider. All endpoints require authentication.

- `GET /api/providers/:id/models` — List models for a provider
- `POST /api/providers/:id/models` — Add a model to a provider
- `PUT /api/providers/:id/models/:modelId` — Update a model
- `DELETE /api/providers/:id/models/:modelId` — Delete a model

### ICS Subscriptions

Manage external ICS calendar subscriptions. All endpoints require authentication.

- `GET /api/ics-subscriptions` — List all ICS subscriptions
- `POST /api/ics-subscriptions` — Create a new subscription
- `GET /api/ics-subscriptions/:id` — Get a specific subscription
- `PUT /api/ics-subscriptions/:id` — Update a subscription
- `DELETE /api/ics-subscriptions/:id` — Delete a subscription
- `POST /api/ics-subscriptions/:id/sync` — Trigger sync for a subscription

### Chat

- `POST /api/chat` — Send a message to the AI chat (streaming response)

### Chat History

- `GET /api/chat-history/:id` — Get chat history by ID

## Error Handling

All endpoints return appropriate HTTP status codes:

- `200 OK`: Successful GET, PUT, PATCH, or DELETE
- `201 Created`: Successful POST
- `401 Unauthorized`: Authentication required
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server error

Error responses include an error message:

```json
{
  "error": "Error description"
}
```

## Database Management

### Reset Database

```bash
# Delete the database
rm prisma/dev.db

# Recreate and seed
npm run db:init
npm run db:seed
```

### View Database

```bash
npx prisma studio
```

This opens a web interface to browse and edit the database.

## Development

The backend uses:

- **Next.js 16** API routes
- **Prisma 6** ORM
- **SQLite** database
- **TypeScript** for type safety

All API routes are located in `app/api/` following Next.js App Router conventions.
