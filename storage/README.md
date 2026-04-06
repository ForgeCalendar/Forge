# Storage Module

A unified storage system that automatically switches between localStorage (when logged out) and TanStack Query with API calls (when logged in).

## Features

- **Automatic switching**: Detects authentication state and uses the appropriate storage method
- **React hooks**: All operations are exposed as React hooks for automatic UI updates
- **Type-safe**: Full TypeScript support with comprehensive types
- **Three data types**: Goals, Events, and Calendar Events

## Installation

The module is already set up and TanStack Query is installed. The QueryClient provider is configured in `app/layout.tsx`.

## Usage

### Import the hooks

```typescript
import { useGoals, useEvents, useCalendarEvents } from "@/storage";
```

### Goals Hook

```typescript
function MyComponent() {
  const {
    goals,
    isLoading,
    error,
    create,
    update,
    delete: deleteGoal,
  } = useGoals();

  // Create a goal
  const handleCreate = async () => {
    const newGoal = await create({
      title: "My Goal",
      description: "Description",
      dueDate: "2026-01-20T10:00:00",
      events: [{ title: "Task 1", completed: false, minutesEstimate: 30 }],
    });
  };

  // Update a goal
  const handleUpdate = async (goalId: string) => {
    await update(goalId, {
      title: "Updated Title",
      description: "Updated description",
    });
  };

  // Delete a goal
  const handleDelete = async (goalId: string) => {
    await deleteGoal(goalId);
  };

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      {goals.map((goal) => (
        <div key={goal.id}>{goal.title}</div>
      ))}
    </div>
  );
}
```

### Events Hook

```typescript
function MyComponent() {
  const { update, delete: deleteEvent } = useEvents();

  // Update a event (e.g., mark as complete)
  const handleToggle = async (eventId: string) => {
    await update(eventId, { completed: true });
  };

  // Delete a event
  const handleDelete = async (eventId: string) => {
    await deleteEvent(eventId);
  };
}
```

### Calendar Events Hook

```typescript
function CalendarComponent() {
  const {
    events,
    isLoading,
    create,
    update,
    delete: deleteEvent,
  } = useCalendarEvents();

  // Create an event
  const handleCreate = async () => {
    await create({
      title: "Meeting",
      start: new Date("2026-01-15T14:00:00"),
      end: new Date("2026-01-15T15:00:00"),
      extendedProps: { kind: "meeting" },
    });
  };

  // Update an event
  const handleUpdate = async (eventId: string) => {
    await update(eventId, {
      title: "Updated Meeting",
      start: new Date("2026-01-15T15:00:00"),
      end: new Date("2026-01-15T16:00:00"),
    });
  };

  // Delete an event
  const handleDelete = async (eventId: string) => {
    await deleteEvent(eventId);
  };

  return (
    <div>
      {events.map((event) => (
        <div key={event.id}>
          {event.title} - {event.start.toLocaleString()}
        </div>
      ))}
    </div>
  );
}
```

## How It Works

### When Logged Out

- Data is stored in browser localStorage
- Keys used: `forge:goals`, `forge:events`
- Operations are synchronous and immediate
- Data persists across browser sessions
- Each item gets a generated ID in format: `timestamp-randomstring`

### When Logged In

- Data is fetched from API endpoints using TanStack Query
- Automatic caching with 5-minute stale time
- Optimistic updates with automatic refetching
- Server-generated UUIDs for IDs
- API endpoints:
  - Goals: `/api/goals` (GET, POST, PUT, DELETE)
  - Events: `/api/events/:id` (PATCH, DELETE)
  - Events: `/api/events` (GET, POST, PATCH, DELETE)

## Advanced Usage

### Direct localStorage access

```typescript
import { localGoals, localEvents } from "@/storage";

// Direct localStorage operations (use with caution)
const goals = localGoals.getAll();
const goal = localGoals.getById("some-id");
```

### Direct TanStack Query hooks

```typescript
import { useGoalsQuery, useCreateGoalMutation } from "@/storage";

// Use TanStack Query hooks directly
const { data: goals } = useGoalsQuery(true);
const createMutation = useCreateGoalMutation();
```

## Types

All types are exported from the storage module:

```typescript
import type {
  Goal,
  Event,
  CalendarEvent,
  GoalWithId,
  EventWithId,
  CalendarEventWithId,
  CreateGoalInput,
  UpdateGoalInput,
  // ... and more
} from "@/storage";
```

## Important Notes

1. **Automatic Switching**: The hooks detect authentication state automatically using `useAuth()`. No manual configuration needed.

2. **Data Migration**: When a user logs in, their localStorage data is NOT automatically synced to the server. You may want to implement a migration function if needed.

3. **Real-time Updates**: When logged in, React Query handles automatic cache invalidation and refetching after mutations.

4. **Error Handling**: All async operations can throw errors. Use try-catch or handle promises appropriately.

5. **IDs**: LocalStorage uses generated IDs, while the API uses database UUIDs. Handle this when switching between logged-out and logged-in states.

## File Structure

```
storage/
├── index.ts                    # Main exports
├── types.ts                    # TypeScript types
├── localStorage.ts             # LocalStorage functions
├── hooks.ts                    # Unified hooks (main API)
├── useGoalsQuery.ts           # TanStack Query hooks for goals
├── useEventsQuery.ts          # TanStack Query hooks for events
└── README.md                  # This file
```
