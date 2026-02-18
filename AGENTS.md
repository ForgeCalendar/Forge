# Agent Guide for Forge

This document provides coding agents with essential information about the Forge codebase, including build commands, code style, and architectural patterns.

## Build, Test & Development Commands

### Running the application

```bash
npm run dev              # Start dev server (localhost:3000)
npm run build            # Build for production
npm start                # Start production server
npm run lint             # Run ESLint
```

### Database commands

```bash
npm run db:init          # Run Prisma migrations
npm run db:seed          # Seed database with sample data
```

### Testing

```bash
npm test                 # Run all tests
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Run tests with coverage report
```

### Running a single test file

```bash
npx jest __tests__/api/events/events.test.ts
npx jest __tests__/lib/auth.test.ts --watch
```

### Running a single test case

```bash
npx jest -t "should return all events for authenticated user"
```

## Project Overview

**Forge** is a Next.js 16 app using React 19, TypeScript, Chakra UI v3, Tailwind CSS v4, Prisma (SQLite), and Anthropic AI. It's a goal-centric planning system where AI helps users decide what to work on today by generating context-aware daily events from long-term goals.

### Tech Stack

- Next.js 16 (App Router) + React 19 + TypeScript
- Chakra UI v3 (Ark UI primitives) + Tailwind CSS v4
- Prisma (SQLite) + bcryptjs for auth
- AI: @assistant-ui/react + Anthropic SDK
- State: Zustand, @tanstack/react-query
- Testing: Jest + @testing-library/react

## Code Style Guidelines

### Imports

- Use `@/` alias for absolute imports (configured in tsconfig.json)
- Order: external packages → internal modules → types → styles
- Example:

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import type { Goal } from "@/states/goals";
```

### TypeScript

- **Strict mode enabled** - `noImplicitAny` mindset
- Prefer **explicit return types** for exported functions and hooks
- Use `unknown` over `any`, narrow with type guards
- No unnecessary type widening
- Example:

```typescript
export async function requireAuth(): Promise<string> {
  const email = await getCurrentUser();
  if (!email) {
    throw new Error("Unauthorized");
  }
  return email;
}
```

### React

- Use **function components + hooks** only
- Keep state local; lift only when needed
- Avoid unnecessary `useEffect` - prefer derived state
- Handle loading/error/empty states explicitly
- Example:

```tsx
export default function Sidebar({ goals }: Props) {
  const [title, setTitle] = useState("");

  return (
    <Box>
      {goals.length === 0 ? (
        <Text>No goals yet</Text>
      ) : (
        goals.map((g) => <GoalComponent key={g.id} goal={g} />)
      )}
    </Box>
  );
}
```

### Naming Conventions

- **Components**: PascalCase (`Sidebar.tsx`, `WorkDialog.tsx`)
- **Hooks**: camelCase starting with `use` (`useAuth.tsx`, `useGoalsQuery.ts`)
- **Utilities**: camelCase (`auth.ts`, `prisma.ts`)
- **Types**: PascalCase (`Goal`, `CreateGoalInput`)
- **API routes**: lowercase (`route.ts` in `/api/events/`)

### Error Handling

- Always handle error paths - show user-friendly errors, log dev info
- Use try-catch in API routes with proper HTTP status codes
- Check authentication first: `await requireAuth()` throws on failure
- Example:

```typescript
export async function GET() {
  try {
    const userId = await requireAuth();
    const events = await prisma.calendarEvent.findMany({ where: { userId } });
    return NextResponse.json(events);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }
    console.error("Error fetching events:", error);
    return NextResponse.json(
      { error: "Failed to fetch events" },
      { status: 500 }
    );
  }
}
```

### Testing

- Tests in `__tests__/` directory mirroring app structure
- Use `jest.mock()` for external dependencies
- Mock Prisma with `@/__tests__/utils/prisma-mock.ts`
- Test happy path + edge cases (auth failures, DB errors, empty states)
- Example:

```typescript
import { prismaMock } from "@/__tests__/utils/prisma-mock";
import * as auth from "@/lib/auth";

jest.mock("@/lib/auth");

it("should return 401 when user is not authenticated", async () => {
  (auth.requireAuth as jest.Mock).mockRejectedValue(new Error("Unauthorized"));
  const response = await GET();
  expect(response.status).toBe(401);
});
```

## Architecture & Organization

### Directory Structure

```
app/              # Next.js App Router
├── api/          # API routes (REST endpoints)
├── layout.tsx    # Root layout
└── page.tsx      # Home page
components/       # React components
├── assistant-ui/ # AI chat UI components
├── ui/          # Shared UI primitives (Chakra)
├── App.tsx      # Main app component
└── ...          # Feature components
states/          # Zustand stores & type definitions
storage/         # React Query hooks for data fetching
lib/             # Utilities (auth, prisma, utils)
prisma/          # Database schema & migrations
__tests__/       # Jest tests (mirrors app structure)
```

### Feature-Oriented Structure

- Group related code by feature, not by type
- Avoid dumping everything into `utils/`
- Keep modules small and composable
- No circular dependencies

### API Routes (Next.js App Router)

- Located in `app/api/[resource]/route.ts`
- Export named functions: `GET`, `POST`, `PUT`, `DELETE`, `PATCH`
- Always check auth first: `const userId = await requireAuth()`
- Return `NextResponse.json()` with proper status codes
- Transform DB models to match client expectations (e.g., FullCalendar format)

### Database (Prisma)

- SQLite for simplicity (file: `./dev.db`)
- Prisma client generated to `lib/generated/prisma`
- Import: `import { prisma } from "@/lib/prisma"`
- Models: User, Goal, Event, InfoTag, CalendarEvent, AIAgentApiKey
- All user data is scoped by `userId` (cascade delete on user deletion)

### Authentication

- Cookie-based sessions (`session_user_email`)
- `requireAuth()` throws "Unauthorized" if not logged in
- `getCurrentUser()` returns email or null
- Passwords hashed with bcryptjs (10 salt rounds)

## UI & Styling

### Chakra UI v3

- Import from `@chakra-ui/react`
- Use Chakra components for consistency
- Color mode: `useColorModeValue(lightValue, darkValue)`
- Dialog pattern with Portal and Backdrop:

```tsx
<Dialog.Root>
  <Dialog.Trigger asChild>
    <Button>Open</Button>
  </Dialog.Trigger>
  <Portal>
    <Dialog.Backdrop />
    <Dialog.Positioner>
      <Dialog.Content>
        <Dialog.Header>
          <Dialog.Title>Title</Dialog.Title>
        </Dialog.Header>
        <Dialog.Body>Content</Dialog.Body>
      </Dialog.Content>
    </Dialog.Positioner>
  </Portal>
</Dialog.Root>
```

### Tailwind CSS v4

- Utility-first styling for custom components
- Configured with PostCSS (Tailwind v4 uses CSS-first config)

### Dark Mode

- `next-themes` provides theme context
- Chakra's `ColorModeProvider` integrated
- Use `useColorModeValue()` for conditional colors

## Communication & Development Philosophy

### From `.cursor/rules/00-project.mdc`:

- **Ask at most 1 question** only when absolutely blocked
- Otherwise: make reasonable assumptions, state them briefly, proceed
- If ambiguous, implement safest default + leave TODOs
- Keep diffs minimal and localized
- Do not reformat unrelated files
- Do not rename public APIs unless requested

### Goals:

- Ship working features with clean, maintainable code
- Avoid overengineering; prefer small, composable modules
- Make changes easy to review: minimal diff, clear intent, good names

## Security & Best Practices

- **Never commit secrets** - `.env*` files are gitignored
- Treat user input as untrusted - validate at API boundaries
- Avoid `dangerouslySetInnerHTML` unless required
- Use explicit runtime validation (Zod for schemas)
- Handle loading/error/empty states in UI
- Debounce user input when hitting network
- Prefer pagination/virtualization for large lists
