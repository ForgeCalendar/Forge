# Backend Testing Documentation

This project has comprehensive backend testing with mocking using Jest and GitHub Actions integration.

## Test Structure

```
__tests__/
├── api/
│   ├── auth/
│   │   ├── register.test.ts       # User registration tests
│   │   └── login.test.ts          # User login tests
│   ├── goals/
│   │   ├── goals.test.ts          # Goals CRUD tests (GET, POST)
│   │   └── goal-id.test.ts        # Individual goal tests (GET, PUT, DELETE)
│   ├── events/
│   │   └── event-id.test.ts # Event tests (PATCH, DELETE)
│   └── events/
│       └── events.test.ts         # Calendar events tests (GET, POST)
├── lib/
│   └── auth.test.ts               # Auth utilities tests
└── utils/
    ├── prisma-mock.ts             # Prisma Client mock setup
    └── test-helpers.ts            # Test utilities and fixtures
```

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

## Test Coverage

All 50 tests pass successfully, covering:

- ✅ Authentication (Register, Login) - 13 tests
- ✅ Goals CRUD operations - 11 tests
- ✅ Events operations - 8 tests
- ✅ Calendar events - 8 tests
- ✅ Auth utilities - 6 tests
- ✅ Goal individual operations - 4 tests

## Mocking Strategy

### Prisma Client Mocking

The test suite uses `jest-mock-extended` to create deep mocks of the Prisma Client. This allows:

- Full isolation from the database
- Fast test execution
- Predictable test results
- Easy simulation of database errors

The mock is configured globally in `jest.setup.js` and can be accessed in tests via:

```typescript
import { prismaMock } from "@/__tests__/utils/prisma-mock";

prismaMock.user.findUnique.mockResolvedValue(mockUser);
```

### Next.js Mocking

- **Request/Response**: Using Next.js native `NextRequest` and `NextResponse`
- **Cookies**: Mocked in `jest.setup.js` using `jest.mock('next/headers')`
- **Auth utilities**: Mocked per-test using `jest.mock('@/lib/auth')`

### Test Helpers

The `test-helpers.ts` file provides:

- `createMockRequest()`: Creates mock Next.js requests with body/headers/cookies
- Mock data fixtures: `mockUser`, `mockGoal`, `mockEvent`, `mockEvent`

## GitHub Actions Integration

Tests run automatically on:

- Push to `master` or `main` branches
- Pull requests to `master` or `main` branches

The workflow (`.github/workflows/backend-tests.yml`):

1. Checks out code
2. Sets up Node.js 20.x
3. Installs dependencies
4. Generates Prisma Client
5. Runs tests with coverage
6. Uploads coverage to Codecov (optional)

## Configuration

### Jest Configuration (`jest.config.js`)

- Uses Next.js Jest configuration preset
- Test environment: Node.js
- Coverage threshold: 70% for all metrics
- Module path aliasing: `@/` → project root

### Test Setup (`jest.setup.js`)

- Loads `@testing-library/jest-dom` matchers
- Sets test environment variables
- Mocks Prisma Client globally
- Mocks Next.js headers and cookies

## Writing New Tests

### Basic Test Template

```typescript
import { prismaMock } from "@/__tests__/utils/prisma-mock";
import { createMockRequest } from "@/__tests__/utils/test-helpers";
import * as auth from "@/lib/auth";

jest.mock("@/lib/auth", () => ({
  requireAuth: jest.fn(),
}));

describe("Your endpoint", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should do something", async () => {
    // Setup mocks
    (auth.requireAuth as jest.Mock).mockResolvedValue("user@example.com");
    prismaMock.model.method.mockResolvedValue(mockData);

    // Create request
    const request = createMockRequest({
      method: "GET",
      body: {
        /* ... */
      },
    });

    // Call handler
    const response = await GET(request);
    const data = await response.json();

    // Assertions
    expect(response.status).toBe(200);
    expect(data).toHaveProperty("id");
  });
});
```

## Best Practices

1. **Clear mock data between tests**: Use `jest.clearAllMocks()` in `beforeEach()`
2. **Test error cases**: Include tests for 400, 401, 404, 500 responses
3. **Mock at the right level**: Mock Prisma, not the database
4. **Avoid deep equality checks on dates**: Dates serialize to strings in JSON
5. **Test business logic, not implementation**: Focus on inputs/outputs

## Continuous Integration

Tests must pass before merging pull requests. The GitHub Actions workflow ensures:

- All tests pass in a clean environment
- Dependencies install correctly
- Prisma schema is valid
- Code coverage meets thresholds

## Troubleshooting

### "Table does not exist" errors

- Ensure Prisma Client is generated: `npx prisma generate`
- Check that `jest.setup.js` properly mocks `@/lib/prisma`

### Mock not working

- Import `prismaMock` before the code under test
- Ensure `jest.clearAllMocks()` is called between tests
- Check mock return values match expected types

### Date serialization issues

- Remember that `Date` objects become strings in JSON responses
- Test individual properties rather than deep equality with dates
