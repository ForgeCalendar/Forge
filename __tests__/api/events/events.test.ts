import { GET, POST } from "@/app/api/events/route";
import { prismaMock } from "@/__tests__/utils/prisma-mock";
import { createMockRequest, mockEvent } from "@/__tests__/utils/test-helpers";
import * as auth from "@/lib/auth";

jest.mock("@/lib/auth", () => ({
  requireAuth: jest.fn(),
}));

describe("GET /api/events", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return all events for authenticated user in FullCalendar format", async () => {
    (auth.requireAuth as jest.Mock).mockResolvedValue("test@example.com");

    const mockEvents = [
      {
        ...mockEvent,
        metadata: JSON.stringify({ location: "Office" }),
      },
    ];

    prismaMock.event.findMany.mockResolvedValue(mockEvents as any);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveLength(1);
    expect(data[0]).toHaveProperty("id");
    expect(data[0]).toHaveProperty("title");
    expect(data[0]).toHaveProperty("start");
    expect(data[0]).toHaveProperty("end");
    expect(data[0]).toHaveProperty("extendedProps");
    expect(data[0].extendedProps.kind).toBe("meeting");
    expect(data[0].extendedProps.location).toBe("Office");
    expect(prismaMock.event.findMany).toHaveBeenCalledWith({
      where: { userId: "test@example.com" },
      orderBy: { start: "asc" },
    });
  });

  it("should return empty array when user has no events", async () => {
    (auth.requireAuth as jest.Mock).mockResolvedValue("test@example.com");
    prismaMock.event.findMany.mockResolvedValue([]);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual([]);
  });

  it("should return 401 when user is not authenticated", async () => {
    (auth.requireAuth as jest.Mock).mockRejectedValue(
      new Error("Unauthorized")
    );

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Authentication required");
  });

  it("should return 500 when database error occurs", async () => {
    (auth.requireAuth as jest.Mock).mockResolvedValue("test@example.com");
    prismaMock.event.findMany.mockRejectedValue(
      new Error("Database error")
    );

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to fetch events");
  });
});

describe("POST /api/events", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should create a new event with metadata", async () => {
    (auth.requireAuth as jest.Mock).mockResolvedValue("test@example.com");

    const createdEvent = {
      ...mockEvent,
      title: "Team Meeting",
      metadata: JSON.stringify({ location: "Conference Room A" }),
    };

    prismaMock.event.create.mockResolvedValue(createdEvent as any);

    const request = createMockRequest({
      method: "POST",
      body: {
        title: "Team Meeting",
        start: "2024-06-01T10:00:00Z",
        end: "2024-06-01T11:00:00Z",
        kind: "meeting",
        metadata: { location: "Conference Room A" },
      },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.title).toBe("Team Meeting");
    expect(data.extendedProps.kind).toBe("meeting");
    expect(data.extendedProps.location).toBe("Conference Room A");
    expect(prismaMock.event.create).toHaveBeenCalledWith({
      data: {
        userId: "test@example.com",
        title: "Team Meeting",
        start: new Date("2024-06-01T10:00:00Z").toISOString(),
        end: new Date("2024-06-01T11:00:00Z").toISOString(),
        kind: "meeting",
        metadata: JSON.stringify({ location: "Conference Room A" }),
      },
    });
  });

  it("should create event without metadata", async () => {
    (auth.requireAuth as jest.Mock).mockResolvedValue("test@example.com");

    const createdEvent = {
      ...mockEvent,
      title: "Simple Event",
      metadata: null,
    };

    prismaMock.event.create.mockResolvedValue(createdEvent as any);

    const request = createMockRequest({
      method: "POST",
      body: {
        title: "Simple Event",
        start: "2024-06-01T10:00:00Z",
        end: "2024-06-01T11:00:00Z",
        kind: "task",
      },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.title).toBe("Simple Event");
  });

  it("should return 401 when user is not authenticated", async () => {
    (auth.requireAuth as jest.Mock).mockRejectedValue(
      new Error("Unauthorized")
    );

    const request = createMockRequest({
      method: "POST",
      body: {
        title: "Test Event",
        start: "2024-06-01T10:00:00Z",
        end: "2024-06-01T11:00:00Z",
        kind: "meeting",
      },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Authentication required");
  });

  it("should return 500 when database error occurs", async () => {
    (auth.requireAuth as jest.Mock).mockResolvedValue("test@example.com");
    prismaMock.event.create.mockRejectedValue(
      new Error("Database error")
    );

    const request = createMockRequest({
      method: "POST",
      body: {
        title: "Test Event",
        start: "2024-06-01T10:00:00Z",
        end: "2024-06-01T11:00:00Z",
        kind: "meeting",
      },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to create event");
  });
});
