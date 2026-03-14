import { GET, PUT, DELETE } from "@/app/api/ics-subscriptions/[id]/route";
import { prismaMock } from "@/__tests__/utils/prisma-mock";
import {
  createMockRequest,
  mockIcsSubscription,
} from "@/__tests__/utils/test-helpers";
import * as auth from "@/lib/auth";

jest.mock("@/lib/auth", () => ({
  requireAuth: jest.fn(),
}));

describe("GET /api/ics-subscriptions/:id", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return a specific ICS subscription", async () => {
    (auth.requireAuth as jest.Mock).mockResolvedValue("test@example.com");

    prismaMock.icsSubscription.findFirst.mockResolvedValue(
      mockIcsSubscription as any
    );

    const request = createMockRequest({ method: "GET" });
    const params = Promise.resolve({ id: "ics-sub-1" });

    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.id).toBe("ics-sub-1");
    expect(data.name).toBe("Work Calendar");
    expect(prismaMock.icsSubscription.findFirst).toHaveBeenCalledWith({
      where: {
        id: "ics-sub-1",
        userId: "test@example.com",
      },
    });
  });

  it("should return 404 when subscription is not found", async () => {
    (auth.requireAuth as jest.Mock).mockResolvedValue("test@example.com");

    prismaMock.icsSubscription.findFirst.mockResolvedValue(null);

    const request = createMockRequest({ method: "GET" });
    const params = Promise.resolve({ id: "non-existent-id" });

    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Subscription not found");
  });

  it("should return 401 when user is not authenticated", async () => {
    (auth.requireAuth as jest.Mock).mockRejectedValue(
      new Error("Unauthorized")
    );

    const request = createMockRequest({ method: "GET" });
    const params = Promise.resolve({ id: "ics-sub-1" });

    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Authentication required");
  });

  it("should return 500 when database error occurs", async () => {
    (auth.requireAuth as jest.Mock).mockResolvedValue("test@example.com");
    prismaMock.icsSubscription.findFirst.mockRejectedValue(
      new Error("Database error")
    );

    const request = createMockRequest({ method: "GET" });
    const params = Promise.resolve({ id: "ics-sub-1" });

    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to fetch ICS subscription");
  });
});

describe("PUT /api/ics-subscriptions/:id", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should update an ICS subscription", async () => {
    (auth.requireAuth as jest.Mock).mockResolvedValue("test@example.com");

    prismaMock.icsSubscription.findFirst.mockResolvedValue(
      mockIcsSubscription as any
    );
    prismaMock.icsSubscription.update.mockResolvedValue({
      ...mockIcsSubscription,
      name: "Updated Calendar",
    } as any);

    const request = createMockRequest({
      method: "PUT",
      body: { name: "Updated Calendar" },
    });
    const params = Promise.resolve({ id: "ics-sub-1" });

    const response = await PUT(request, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.name).toBe("Updated Calendar");
    expect(prismaMock.icsSubscription.update).toHaveBeenCalledWith({
      where: { id: "ics-sub-1" },
      data: { name: "Updated Calendar" },
    });
  });

  it("should update url if valid", async () => {
    (auth.requireAuth as jest.Mock).mockResolvedValue("test@example.com");

    prismaMock.icsSubscription.findFirst.mockResolvedValue(
      mockIcsSubscription as any
    );
    prismaMock.icsSubscription.update.mockResolvedValue({
      ...mockIcsSubscription,
      url: "https://new-calendar.example.com/feed.ics",
    } as any);

    const request = createMockRequest({
      method: "PUT",
      body: { url: "https://new-calendar.example.com/feed.ics" },
    });
    const params = Promise.resolve({ id: "ics-sub-1" });

    const response = await PUT(request, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.url).toBe("https://new-calendar.example.com/feed.ics");
  });

  it("should return 400 when url format is invalid", async () => {
    (auth.requireAuth as jest.Mock).mockResolvedValue("test@example.com");

    prismaMock.icsSubscription.findFirst.mockResolvedValue(
      mockIcsSubscription as any
    );

    const request = createMockRequest({
      method: "PUT",
      body: { url: "not-a-valid-url" },
    });
    const params = Promise.resolve({ id: "ics-sub-1" });

    const response = await PUT(request, { params });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid URL format");
  });

  it("should return 404 when subscription is not found", async () => {
    (auth.requireAuth as jest.Mock).mockResolvedValue("test@example.com");

    prismaMock.icsSubscription.findFirst.mockResolvedValue(null);

    const request = createMockRequest({
      method: "PUT",
      body: { name: "Updated Calendar" },
    });
    const params = Promise.resolve({ id: "non-existent-id" });

    const response = await PUT(request, { params });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Subscription not found");
  });

  it("should return 401 when user is not authenticated", async () => {
    (auth.requireAuth as jest.Mock).mockRejectedValue(
      new Error("Unauthorized")
    );

    const request = createMockRequest({
      method: "PUT",
      body: { name: "Updated Calendar" },
    });
    const params = Promise.resolve({ id: "ics-sub-1" });

    const response = await PUT(request, { params });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Authentication required");
  });

  it("should return 500 when database error occurs", async () => {
    (auth.requireAuth as jest.Mock).mockResolvedValue("test@example.com");
    prismaMock.icsSubscription.findFirst.mockResolvedValue(
      mockIcsSubscription as any
    );
    prismaMock.icsSubscription.update.mockRejectedValue(
      new Error("Database error")
    );

    const request = createMockRequest({
      method: "PUT",
      body: { name: "Updated Calendar" },
    });
    const params = Promise.resolve({ id: "ics-sub-1" });

    const response = await PUT(request, { params });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to update ICS subscription");
  });
});

describe("DELETE /api/ics-subscriptions/:id", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should delete an ICS subscription", async () => {
    (auth.requireAuth as jest.Mock).mockResolvedValue("test@example.com");

    prismaMock.icsSubscription.findFirst.mockResolvedValue(
      mockIcsSubscription as any
    );
    prismaMock.icsSubscription.delete.mockResolvedValue(
      mockIcsSubscription as any
    );

    const request = createMockRequest({ method: "DELETE" });
    const params = Promise.resolve({ id: "ics-sub-1" });

    const response = await DELETE(request, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.message).toBe("Subscription deleted successfully");
    expect(prismaMock.icsSubscription.delete).toHaveBeenCalledWith({
      where: { id: "ics-sub-1" },
    });
  });

  it("should return 404 when subscription is not found", async () => {
    (auth.requireAuth as jest.Mock).mockResolvedValue("test@example.com");

    prismaMock.icsSubscription.findFirst.mockResolvedValue(null);

    const request = createMockRequest({ method: "DELETE" });
    const params = Promise.resolve({ id: "non-existent-id" });

    const response = await DELETE(request, { params });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Subscription not found");
  });

  it("should return 401 when user is not authenticated", async () => {
    (auth.requireAuth as jest.Mock).mockRejectedValue(
      new Error("Unauthorized")
    );

    const request = createMockRequest({ method: "DELETE" });
    const params = Promise.resolve({ id: "ics-sub-1" });

    const response = await DELETE(request, { params });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Authentication required");
  });

  it("should return 500 when database error occurs", async () => {
    (auth.requireAuth as jest.Mock).mockResolvedValue("test@example.com");
    prismaMock.icsSubscription.findFirst.mockResolvedValue(
      mockIcsSubscription as any
    );
    prismaMock.icsSubscription.delete.mockRejectedValue(
      new Error("Database error")
    );

    const request = createMockRequest({ method: "DELETE" });
    const params = Promise.resolve({ id: "ics-sub-1" });

    const response = await DELETE(request, { params });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to delete ICS subscription");
  });
});
