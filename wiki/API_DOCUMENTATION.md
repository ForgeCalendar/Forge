# Vibe Kanban Backend API Documentation

This document describes the REST API endpoints for the Vibe Kanban application backend.

## Base URL

All API endpoints are prefixed with `/api`

## Database Setup

### Initial Setup

```bash
# Install dependencies
npm install

# Run migrations to create database tables
npx prisma migrate dev

# Seed the database with sample data
npm run db:seed
```

### Database Schema

The backend uses SQLite with Prisma ORM. The database includes:

- **Goals**: Main planning entities with title, description, and due dates
- **Events**: Tasks/subtasks within goals
- **InfoTags**: Metadata tags for goals
- **CalendarEvents**: Calendar scheduling entries

## API Endpoints

### Goals

#### GET /api/goals

Get all goals with their events and info tags.

**Response:**

```json
[
  {
    "id": "uuid",
    "title": "Goal title",
    "description": "Goal description",
    "dueDate": "2026-01-15T17:00:00" | null,
    "createdAt": "2026-01-15T18:00:00.000Z",
    "updatedAt": "2026-01-15T18:00:00.000Z",
    "events": [
      {
        "id": "uuid",
        "goalId": "uuid",
        "title": "Event title",
        "completed": false,
        "minutesEstimate": 30,
        "order": 0,
        "createdAt": "2026-01-15T18:00:00.000Z",
        "updatedAt": "2026-01-15T18:00:00.000Z"
      }
    ],
    "infoTags": [
      {
        "id": "uuid",
        "goalId": "uuid",
        "title": "Owner",
        "info": "Patrick Li",
        "createdAt": "2026-01-15T18:00:00.000Z",
        "updatedAt": "2026-01-15T18:00:00.000Z"
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
  "dueDate": "2026-01-15T17:00:00" | null,
  "events": [
    {
      "title": "Event title",
      "completed": false,
      "minutesEstimate": 30
    }
  ],
  "infoTags": [
    {
      "title": "Owner",
      "info": "Patrick Li"
    }
  ]
}
```

**Response:** Returns the created goal with all nested data (same structure as GET response).

#### GET /api/goals/:id

Get a specific goal by ID.

**Response:** Returns a single goal object (same structure as GET /api/goals items).

#### PUT /api/goals/:id

Update a goal. Replaces all events and info tags.

**Request Body:** Same as POST /api/goals

**Response:** Returns the updated goal with all nested data.

#### DELETE /api/goals/:id

Delete a goal (cascades to events and info tags).

**Response:**

```json
{
  "message": "Goal deleted successfully"
}
```

### Events

#### PATCH /api/events/:id

Update a event (e.g., toggle completion status).

**Request Body:**

```json
{
  "title": "Updated title",
  "completed": true,
  "minutesEstimate": 45
}
```

All fields are optional. Only provided fields will be updated.

**Response:** Returns the updated event object.

#### DELETE /api/events/:id

Delete a specific event.

**Response:**

```json
{
  "message": "Event deleted successfully"
}
```

### Calendar Events

#### GET /api/events

Get all calendar events.

**Response:**

```json
[
  {
    "id": "uuid",
    "title": "Event title",
    "start": "2026-01-15T09:00:00.000Z",
    "end": "2026-01-15T10:00:00.000Z",
    "extendedProps": {
      "kind": "task" | "break"
    }
  }
]
```

The response format is compatible with FullCalendar.

#### POST /api/events

Create a new calendar event.

**Request Body:**

```json
{
  "title": "Event title",
  "start": "2026-01-15T09:00:00",
  "end": "2026-01-15T10:00:00",
  "kind": "task",
  "metadata": {
    "customField": "value"
  }
}
```

**Response:** Returns the created event in FullCalendar format.

#### GET /api/events/:id

Get a specific event by ID.

**Response:** Returns a single event object (same structure as GET /api/events items).

#### PATCH /api/events/:id

Update an event (useful for drag-and-drop rescheduling).

**Request Body:**

```json
{
  "title": "Updated title",
  "start": "2026-01-15T10:00:00",
  "end": "2026-01-15T11:00:00",
  "kind": "break",
  "metadata": {
    "customField": "new value"
  }
}
```

All fields are optional. Only provided fields will be updated.

**Response:** Returns the updated event.

#### DELETE /api/events/:id

Delete a calendar event.

**Response:**

```json
{
  "message": "Event deleted successfully"
}
```

## Error Handling

All endpoints return appropriate HTTP status codes:

- `200 OK`: Successful GET, PUT, PATCH, or DELETE
- `201 Created`: Successful POST
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
npx prisma migrate dev
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
