import { GET } from "@/app/api/auth/me/route";
import { prismaMock } from "@/__tests__/utils/prisma-mock";
import { mockUser } from "@/__tests__/utils/test-helpers";
import * as auth from "@/lib/auth";

jest.mock("@/lib/auth", () => ({
  getCurrentUser: jest.fn(),
}));

describe("GET /api/auth/me", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return current user when authenticated", async () => {
    (auth.getCurrentUser as jest.Mock).mockResolvedValue("test@example.com");
    prismaMock.user.findUnique.mockResolvedValue(mockUser as any);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.email).toBe(mockUser.id);
    expect(data.createdAt).toBeDefined();
    expect(data.updatedAt).toBeDefined();
    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
      where: { id: "test@example.com" },
      select: {
        id: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  });

  it("should return 401 when not authenticated", async () => {
    (auth.getCurrentUser as jest.Mock).mockResolvedValue(null);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Not authenticated");
  });

  it("should return 404 when user not found in database", async () => {
    (auth.getCurrentUser as jest.Mock).mockResolvedValue("test@example.com");
    prismaMock.user.findUnique.mockResolvedValue(null);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("User not found");
  });

  it("should return 500 when database error occurs", async () => {
    (auth.getCurrentUser as jest.Mock).mockResolvedValue("test@example.com");
    prismaMock.user.findUnique.mockRejectedValue(new Error("Database error"));

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to get user");
  });
});
