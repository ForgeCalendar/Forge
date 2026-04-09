import { GET, PATCH } from "@/app/api/user/route";
import { prismaMock } from "@/__tests__/utils/prisma-mock";
import { createMockRequest, mockUser } from "@/__tests__/utils/test-helpers";
import * as auth from "@/lib/auth";

jest.mock("@/lib/auth", () => ({
  requireAuth: jest.fn(),
}));

describe("GET /api/user", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return user for authenticated request", async () => {
    (auth.requireAuth as jest.Mock).mockResolvedValue("test@example.com");
    prismaMock.user.findUnique.mockResolvedValue({
      id: mockUser.id,
      timezone: mockUser.timezone,
      createdAt: mockUser.createdAt,
    } as any);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.id).toBe(mockUser.id);
    expect(data.timezone).toBe(mockUser.timezone);
    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
      where: { id: "test@example.com" },
      select: {
        id: true,
        timezone: true,
        createdAt: true,
      },
    });
  });

  it("should return 404 when user not found", async () => {
    (auth.requireAuth as jest.Mock).mockResolvedValue("test@example.com");
    prismaMock.user.findUnique.mockResolvedValue(null);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("User not found");
  });

  it("should return 401 when not authenticated", async () => {
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
    prismaMock.user.findUnique.mockRejectedValue(new Error("Database error"));

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to fetch user");
  });
});

describe("PATCH /api/user", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should update user timezone", async () => {
    (auth.requireAuth as jest.Mock).mockResolvedValue("test@example.com");
    prismaMock.user.update.mockResolvedValue({
      id: mockUser.id,
      timezone: "America/Los_Angeles",
      createdAt: mockUser.createdAt,
    } as any);

    const request = createMockRequest({
      method: "PATCH",
      body: { timezone: "America/Los_Angeles" },
    });

    const response = await PATCH(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.timezone).toBe("America/Los_Angeles");
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: "test@example.com" },
      data: { timezone: "America/Los_Angeles" },
      select: {
        id: true,
        timezone: true,
        createdAt: true,
      },
    });
  });

  it("should return 400 when timezone is not a string", async () => {
    (auth.requireAuth as jest.Mock).mockResolvedValue("test@example.com");

    const request = createMockRequest({
      method: "PATCH",
      body: { timezone: 123 },
    });

    const response = await PATCH(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Timezone must be a string");
  });

  it("should return 400 when timezone is invalid", async () => {
    (auth.requireAuth as jest.Mock).mockResolvedValue("test@example.com");

    const request = createMockRequest({
      method: "PATCH",
      body: { timezone: "Invalid/Timezone" },
    });

    const response = await PATCH(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid timezone");
  });

  it("should return 401 when not authenticated", async () => {
    (auth.requireAuth as jest.Mock).mockRejectedValue(
      new Error("Unauthorized")
    );

    const request = createMockRequest({
      method: "PATCH",
      body: { timezone: "America/New_York" },
    });

    const response = await PATCH(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Authentication required");
  });

  it("should return 500 when database error occurs", async () => {
    (auth.requireAuth as jest.Mock).mockResolvedValue("test@example.com");
    prismaMock.user.update.mockRejectedValue(new Error("Database error"));

    const request = createMockRequest({
      method: "PATCH",
      body: { timezone: "America/New_York" },
    });

    const response = await PATCH(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to update user");
  });

  it("should handle empty update body", async () => {
    (auth.requireAuth as jest.Mock).mockResolvedValue("test@example.com");
    prismaMock.user.update.mockResolvedValue({
      id: mockUser.id,
      timezone: mockUser.timezone,
      createdAt: mockUser.createdAt,
    } as any);

    const request = createMockRequest({
      method: "PATCH",
      body: {},
    });

    const response = await PATCH(request);

    expect(response.status).toBe(200);
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: "test@example.com" },
      data: {},
      select: {
        id: true,
        timezone: true,
        createdAt: true,
      },
    });
  });
});
