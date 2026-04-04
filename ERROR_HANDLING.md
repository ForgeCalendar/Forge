# Error Handling Strategy

This document describes the error handling approach used in the application.

## Overview

The application uses a multi-layered error handling strategy:

1. **TanStack Query** - Automatic error handling for data fetching and mutations
2. **Chakra UI Toast** - User-friendly error notifications
3. **React Error Boundaries** - Catch and display React errors gracefully

## Configuration

### TanStack Query (`components/QueryProvider.tsx`)

```typescript
{
  queryCache: new QueryCache({
    onError: (error) => {
      // Show toast for query errors
      toaster.create({
        title: "Error loading data",
        description: error.message,
        type: "error",
        duration: 5000,
      });
    },
  }),
  mutationCache: new MutationCache({
    onError: (error) => {
      // Show toast for mutation errors
      toaster.create({
        title: "Operation failed",
        description: error.message,
        type: "error",
        duration: 5000,
      });
    },
  }),
  defaultOptions: {
    queries: {
      throwOnError: true,  // Errors propagate to error boundaries
    },
    mutations: {
      throwOnError: false, // Errors handled by MutationCache toast
    },
  },
}
```

### Error Boundaries (`components/ErrorBoundary.tsx`)

- Wraps the entire app in `app/layout.tsx`
- Catches React errors and query errors
- Displays a user-friendly error page with:
  - Error message
  - "Try again" button (reloads the page)
  - "Go to home" button (navigates to home)
- Uses `react-error-boundary` package

## Error Handling Flow

### For Queries (GET requests)

1. Query fails
2. Error caught by `QueryCache.onError` → Toast shown
3. Error thrown to component (throwOnError: true)
4. Error Boundary catches it if not handled
5. User sees both toast and error boundary UI

### For Mutations (POST/PUT/DELETE requests)

1. Mutation fails
2. Error caught by `MutationCache.onError` → Toast shown
3. Error NOT thrown (throwOnError: false)
4. Promise resolves without value
5. Component continues execution
6. User sees toast notification only

## Component Patterns

### Old Pattern (with try/catch)

```typescript
try {
  await createMutation.mutateAsync(data);
  setFormData({});
} catch (err) {
  console.error("Failed:", err);
}
```

### New Pattern (with automatic toast)

```typescript
createMutation.mutateAsync(data).then(() => {
  setFormData({});
});
```

## Benefits

✅ **Consistent UX** - All errors show toasts automatically
✅ **Less boilerplate** - No try/catch blocks needed
✅ **Better UX** - Users always see what went wrong
✅ **Graceful degradation** - Error boundaries catch unexpected errors
✅ **Developer friendly** - Errors logged to console automatically

## Dependencies

- `@tanstack/react-query` - Query and mutation management
- `react-error-boundary` - Error boundary implementation
- `@chakra-ui/react` - Toast notifications
