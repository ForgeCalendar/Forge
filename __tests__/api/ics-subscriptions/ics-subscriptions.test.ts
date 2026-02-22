import { GET, POST } from "@/app/api/ics-subscriptions/route";
import { prismaMock } from "@/__tests__/utils/prisma-mock";
import {
  createMockRequest,
  mockIcsSubscription,
} from "@/__tests__/utils/test-helpers";
import * as auth from "@/lib/auth";

jest.mock("@/lib/auth", () => ({
  requireAuth: jest.fn(),
}));

describe("GET /api/ics-subscriptions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return all ICS subscriptions for authenticated user", async () => {
    (auth.requireAuth as jest.Mock).mockResolvedValue("test@example.com");

    const mockSubs = [
      { ...mockIcsSubscription, id: "sub-1", name: "Work Calendar" },
      { ...mockIcsSubscription, id: "sub-2", name: "Personal Calendar" },
    ];

    prismaMock.icsSubscription.findMany.mockResolvedValue(mockSubs as any);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveLength(2);
    expect(data[0].id).toBe("sub-1");
    expect(data[1].id).toBe("sub-2");
    expect(prismaMock.icsSubscription.findMany).toHaveBeenCalledWith({
      where: { userId: "test@example.com" },
      orderBy: { createdAt: "desc" },
    });
  });

  it("should return 401 when user is not authenticated", async () => {
    (auth.requireAuth as jest.Mock).mockRejectedValue(
      new Error("Unauthorized"),
    );

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Authentication required");
  });

  it("should return 500 when database error occurs", async () => {
    (auth.requireAuth as jest.Mock).mockResolvedValue("test@example.com");
    prismaMock.icsSubscription.findMany.mockRejectedValue(
      new Error("Database error"),
    );

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to fetch ICS subscriptions");
  });
});

describe("POST /api/ics-subscriptions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should create a new ICS subscription", async () => {
    (auth.requireAuth as jest.Mock).mockResolvedValue("test@example.com");

    prismaMock.icsSubscription.create.mockResolvedValue(
      mockIcsSubscription as any,
    );

    const request = createMockRequest({
      method: "POST",
      body: {
        name: "Work Calendar",
        url: "https://calendar.google.com/calendar/ical/test/basic.ics",
      },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.id).toBe(mockIcsSubscription.id);
    expect(data.name).toBe("Work Calendar");
    expect(prismaMock.icsSubscription.create).toHaveBeenCalledWith({
      data: {
        userId: "test@example.com",
        name: "Work Calendar",
        url: "https://calendar.google.com/calendar/ical/test/basic.ics",
      },
    });
  });

  it("should return 400 when name is missing", async () => {
    (auth.requireAuth as jest.Mock).mockResolvedValue("test@example.com");

    const request = createMockRequest({
      method: "POST",
      body: {
        url: "https://calendar.google.com/calendar/ical/test/basic.ics",
      },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Name and url are required");
  });

  it("should return 400 when url is missing", async () => {
    (auth.requireAuth as jest.Mock).mockResolvedValue("test@example.com");

    const request = createMockRequest({
      method: "POST",
      body: {
        name: "Work Calendar",
      },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Name and url are required");
  });

  it("should return 400 when url format is invalid", async () => {
    (auth.requireAuth as jest.Mock).mockResolvedValue("test@example.com");

    const request = createMockRequest({
      method: "POST",
      body: {
        name: "Work Calendar",
        url: "not-a-valid-url",
      },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid URL format");
  });

  it("should return 401 when user is not authenticated", async () => {
    (auth.requireAuth as jest.Mock).mockRejectedValue(
      new Error("Unauthorized"),
    );

    const request = createMockRequest({
      method: "POST",
      body: {
        name: "Work Calendar",
        url: "https://calendar.google.com/calendar/ical/test/basic.ics",
      },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Authentication required");
  });

  it("should return 500 when database error occurs", async () => {
    (auth.requireAuth as jest.Mock).mockResolvedValue("test@example.com");
    prismaMock.icsSubscription.create.mockRejectedValue(
      new Error("Database error"),
    );

    const request = createMockRequest({
      method: "POST",
      body: {
        name: "Work Calendar",
        url: "https://calendar.google.com/calendar/ical/test/basic.ics",
      },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to create ICS subscription");
  });
});
