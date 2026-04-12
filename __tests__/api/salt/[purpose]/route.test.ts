import { GET } from "@/app/api/salt/[purpose]/route";
import { prismaMock } from "@/__tests__/utils/prisma-mock";
import * as auth from "@/lib/auth";

jest.mock("@/lib/auth", () => ({
  requireAuth: jest.fn(),
}));

describe("GET /api/salt/[purpose]", () => {
  const mockSalt = {
    id: "salt-id",
    userId: "test@example.com",
    purpose: "authentication" as const,
    salt: "mockSaltValue123==",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("authentication purpose (no auth required)", () => {
    it("should return salt for valid username", async () => {
      prismaMock.userSalt.findUnique.mockResolvedValue(mockSalt);

      const request = new Request(
        "http://localhost:3000/api/salt/authentication?username=test@example.com"
      );
      const params = Promise.resolve({ purpose: "authentication" });

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.salt).toBe("mockSaltValue123==");
      expect(prismaMock.userSalt.findUnique).toHaveBeenCalledWith({
        where: {
          userId_purpose: {
            userId: "test@example.com",
            purpose: "authentication",
          },
        },
      });
    });

    it("should return 400 when username is missing", async () => {
      const request = new Request(
        "http://localhost:3000/api/salt/authentication"
      );
      const params = Promise.resolve({ purpose: "authentication" });

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Username is required");
    });

    it("should return 404 when salt not found", async () => {
      prismaMock.userSalt.findUnique.mockResolvedValue(null);

      const request = new Request(
        "http://localhost:3000/api/salt/authentication?username=nonexistent@example.com"
      );
      const params = Promise.resolve({ purpose: "authentication" });

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Salt not found");
    });
  });

  describe("apikey purpose (auth required)", () => {
    it("should return salt for authenticated user", async () => {
      const apikeyMockSalt = {
        ...mockSalt,
        purpose: "apikey" as const,
      };

      (auth.requireAuth as jest.Mock).mockResolvedValue("test@example.com");
      prismaMock.userSalt.findUnique.mockResolvedValue(apikeyMockSalt);

      const request = new Request("http://localhost:3000/api/salt/apikey");
      const params = Promise.resolve({ purpose: "apikey" });

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.salt).toBe("mockSaltValue123==");
      expect(auth.requireAuth).toHaveBeenCalled();
      expect(prismaMock.userSalt.findUnique).toHaveBeenCalledWith({
        where: {
          userId_purpose: {
            userId: "test@example.com",
            purpose: "apikey",
          },
        },
      });
    });

    it("should return 401 when not authenticated", async () => {
      (auth.requireAuth as jest.Mock).mockRejectedValue(
        new Error("Unauthorized")
      );

      const request = new Request("http://localhost:3000/api/salt/apikey");
      const params = Promise.resolve({ purpose: "apikey" });

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 404 when salt not found for authenticated user", async () => {
      (auth.requireAuth as jest.Mock).mockResolvedValue("test@example.com");
      prismaMock.userSalt.findUnique.mockResolvedValue(null);

      const request = new Request("http://localhost:3000/api/salt/apikey");
      const params = Promise.resolve({ purpose: "apikey" });

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Salt not found");
    });
  });

  describe("invalid purpose", () => {
    it("should return 400 for invalid purpose", async () => {
      const request = new Request(
        "http://localhost:3000/api/salt/invalid?username=test@example.com"
      );
      const params = Promise.resolve({ purpose: "invalid" });

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid purpose");
    });
  });

  describe("error handling", () => {
    it("should return 500 when database error occurs", async () => {
      prismaMock.userSalt.findUnique.mockRejectedValue(
        new Error("Database error")
      );

      const request = new Request(
        "http://localhost:3000/api/salt/authentication?username=test@example.com"
      );
      const params = Promise.resolve({ purpose: "authentication" });

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to fetch salt");
    });
  });
});
