import { GET, PATCH, DELETE } from "@/app/api/events/[id]/route";
import { prismaMock } from "@/__tests__/utils/prisma-mock";
import { createMockRequest, mockEvent } from "@/__tests__/utils/test-helpers";
import * as auth from "@/lib/auth";

jest.mock("@/lib/auth", () => ({
  requireAuth: jest.fn(),
}));

describe("GET /api/events/:id", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return event for authenticated user", async () => {
    (auth.requireAuth as jest.Mock).mockResolvedValue("test@example.com");
    prismaMock.event.findFirst.mockResolvedValue(mockEvent as any);

    const request = createMockRequest({ method: "GET" });
    const params = Promise.resolve({ id: "event-1" });

    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.id).toBe(mockEvent.id);
    expect(data.title).toBe(mockEvent.title);
    expect(prismaMock.event.findFirst).toHaveBeenCalledWith({
      where: { id: "event-1", userId: "test@example.com" },
    });
  });

  it("should return 404 when event not found", async () => {
    (auth.requireAuth as jest.Mock).mockResolvedValue("test@example.com");
    prismaMock.event.findFirst.mockResolvedValue(null);

    const request = createMockRequest({ method: "GET" });
    const params = Promise.resolve({ id: "non-existent" });

    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Event not found");
  });

  it("should return 401 when not authenticated", async () => {
    (auth.requireAuth as jest.Mock).mockRejectedValue(
      new Error("Unauthorized")
    );

    const request = createMockRequest({ method: "GET" });
    const params = Promise.resolve({ id: "event-1" });

    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Authentication required");
  });

  it("should return 500 when database error occurs", async () => {
    (auth.requireAuth as jest.Mock).mockResolvedValue("test@example.com");
    prismaMock.event.findFirst.mockRejectedValue(new Error("Database error"));

    const request = createMockRequest({ method: "GET" });
    const params = Promise.resolve({ id: "event-1" });

    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to fetch event");
  });
});

describe("PATCH /api/events/:id", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should update event successfully", async () => {
    (auth.requireAuth as jest.Mock).mockResolvedValue("test@example.com");
    prismaMock.event.findFirst.mockResolvedValue(mockEvent as any);

    const updatedEvent = {
      ...mockEvent,
      title: "Updated Event",
      completed: true,
    };
    prismaMock.event.update.mockResolvedValue(updatedEvent as any);

    const request = createMockRequest({
      method: "PATCH",
      body: {
        title: "Updated Event",
        completed: true,
      },
    });
    const params = Promise.resolve({ id: "event-1" });

    const response = await PATCH(request, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.title).toBe("Updated Event");
    expect(prismaMock.event.update).toHaveBeenCalledWith({
      where: { id: "event-1" },
      data: {
        title: "Updated Event",
        completed: true,
      },
    });
  });

  it("should update event with metadata", async () => {
    (auth.requireAuth as jest.Mock).mockResolvedValue("test@example.com");
    prismaMock.event.findFirst.mockResolvedValue(mockEvent as any);

    const updatedEvent = {
      ...mockEvent,
      metadata: '{"priority":"high"}',
    };
    prismaMock.event.update.mockResolvedValue(updatedEvent as any);

    const request = createMockRequest({
      method: "PATCH",
      body: {
        metadata: { priority: "high" },
      },
    });
    const params = Promise.resolve({ id: "event-1" });

    const response = await PATCH(request, { params });

    expect(response.status).toBe(200);
    expect(prismaMock.event.update).toHaveBeenCalledWith({
      where: { id: "event-1" },
      data: {
        metadata: '{"priority":"high"}',
      },
    });
  });

  it("should update event with null metadata", async () => {
    (auth.requireAuth as jest.Mock).mockResolvedValue("test@example.com");
    prismaMock.event.findFirst.mockResolvedValue(mockEvent as any);
    prismaMock.event.update.mockResolvedValue({
      ...mockEvent,
      metadata: null,
    } as any);

    const request = createMockRequest({
      method: "PATCH",
      body: {
        metadata: null,
      },
    });
    const params = Promise.resolve({ id: "event-1" });

    const response = await PATCH(request, { params });

    expect(response.status).toBe(200);
    expect(prismaMock.event.update).toHaveBeenCalledWith({
      where: { id: "event-1" },
      data: {
        metadata: null,
      },
    });
  });

  it("should update event dates", async () => {
    (auth.requireAuth as jest.Mock).mockResolvedValue("test@example.com");
    prismaMock.event.findFirst.mockResolvedValue(mockEvent as any);
    prismaMock.event.update.mockResolvedValue(mockEvent as any);

    const request = createMockRequest({
      method: "PATCH",
      body: {
        start: "2024-07-01T10:00:00.000Z",
        end: "2024-07-01T11:00:00.000Z",
      },
    });
    const params = Promise.resolve({ id: "event-1" });

    const response = await PATCH(request, { params });

    expect(response.status).toBe(200);
    expect(prismaMock.event.update).toHaveBeenCalledWith({
      where: { id: "event-1" },
      data: {
        start: new Date("2024-07-01T10:00:00.000Z"),
        end: new Date("2024-07-01T11:00:00.000Z"),
      },
    });
  });

  it("should return 404 when event not found", async () => {
    (auth.requireAuth as jest.Mock).mockResolvedValue("test@example.com");
    prismaMock.event.findFirst.mockResolvedValue(null);

    const request = createMockRequest({
      method: "PATCH",
      body: { title: "Updated" },
    });
    const params = Promise.resolve({ id: "non-existent" });

    const response = await PATCH(request, { params });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Event not found");
  });

  it("should return 401 when not authenticated", async () => {
    (auth.requireAuth as jest.Mock).mockRejectedValue(
      new Error("Unauthorized")
    );

    const request = createMockRequest({
      method: "PATCH",
      body: { title: "Updated" },
    });
    const params = Promise.resolve({ id: "event-1" });

    const response = await PATCH(request, { params });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Authentication required");
  });

  it("should return 500 when database error occurs", async () => {
    (auth.requireAuth as jest.Mock).mockResolvedValue("test@example.com");
    prismaMock.event.findFirst.mockResolvedValue(mockEvent as any);
    prismaMock.event.update.mockRejectedValue(new Error("Database error"));

    const request = createMockRequest({
      method: "PATCH",
      body: { title: "Updated" },
    });
    const params = Promise.resolve({ id: "event-1" });

    const response = await PATCH(request, { params });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to update event");
  });
});

describe("DELETE /api/events/:id", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should delete event successfully", async () => {
    (auth.requireAuth as jest.Mock).mockResolvedValue("test@example.com");
    prismaMock.event.findFirst.mockResolvedValue(mockEvent as any);
    prismaMock.event.delete.mockResolvedValue(mockEvent as any);

    const request = createMockRequest({ method: "DELETE" });
    const params = Promise.resolve({ id: "event-1" });

    const response = await DELETE(request, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.message).toBe("Event deleted successfully");
    expect(prismaMock.event.delete).toHaveBeenCalledWith({
      where: { id: "event-1" },
    });
  });

  it("should return 404 when event not found", async () => {
    (auth.requireAuth as jest.Mock).mockResolvedValue("test@example.com");
    prismaMock.event.findFirst.mockResolvedValue(null);

    const request = createMockRequest({ method: "DELETE" });
    const params = Promise.resolve({ id: "non-existent" });

    const response = await DELETE(request, { params });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Event not found");
  });

  it("should return 401 when not authenticated", async () => {
    (auth.requireAuth as jest.Mock).mockRejectedValue(
      new Error("Unauthorized")
    );

    const request = createMockRequest({ method: "DELETE" });
    const params = Promise.resolve({ id: "event-1" });

    const response = await DELETE(request, { params });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Authentication required");
  });

  it("should return 500 when database error occurs", async () => {
    (auth.requireAuth as jest.Mock).mockResolvedValue("test@example.com");
    prismaMock.event.findFirst.mockResolvedValue(mockEvent as any);
    prismaMock.event.delete.mockRejectedValue(new Error("Database error"));

    const request = createMockRequest({ method: "DELETE" });
    const params = Promise.resolve({ id: "event-1" });

    const response = await DELETE(request, { params });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to delete event");
  });
});
