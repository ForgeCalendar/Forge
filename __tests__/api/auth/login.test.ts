import { POST } from "@/app/api/auth/login/route";
import { prismaMock } from "@/__tests__/utils/prisma-mock";
import { createMockRequest, mockUser } from "@/__tests__/utils/test-helpers";
import * as auth from "@/lib/auth";
import * as cryptoServer from "@/lib/crypto/server";

jest.mock("@/lib/auth", () => ({
  setAuthCookie: jest.fn(),
}));

jest.mock("@/lib/crypto/server", () => ({
  verifyAuthkey: jest.fn(),
}));

describe("POST /api/auth/login", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should login user successfully with valid authkey", async () => {
    (cryptoServer.verifyAuthkey as jest.Mock).mockResolvedValue(true);
    (auth.setAuthCookie as jest.Mock).mockResolvedValue(undefined);

    prismaMock.user.findUnique.mockResolvedValue(mockUser);

    const request = createMockRequest({
      method: "POST",
      body: {
        email: "test@example.com",
        authkey: "derivedAuthkey123==",
      },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.message).toBe("Login successful");
    expect(data.user.email).toBe("test@example.com");
    expect(cryptoServer.verifyAuthkey).toHaveBeenCalledWith(
      "derivedAuthkey123==",
      mockUser.authkeyHash
    );
    expect(auth.setAuthCookie).toHaveBeenCalledWith("test@example.com");
  });

  it("should return 400 when email is missing", async () => {
    const request = createMockRequest({
      method: "POST",
      body: {
        authkey: "authkey123==",
      },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Email and authkey are required");
  });

  it("should return 400 when authkey is missing", async () => {
    const request = createMockRequest({
      method: "POST",
      body: {
        email: "test@example.com",
      },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Email and authkey are required");
  });

  it("should return 401 when user does not exist", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    const request = createMockRequest({
      method: "POST",
      body: {
        email: "nonexistent@example.com",
        authkey: "authkey123==",
      },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Invalid email or authkey");
  });

  it("should return 401 when authkey is incorrect", async () => {
    (cryptoServer.verifyAuthkey as jest.Mock).mockResolvedValue(false);
    prismaMock.user.findUnique.mockResolvedValue(mockUser);

    const request = createMockRequest({
      method: "POST",
      body: {
        email: "test@example.com",
        authkey: "wrongAuthkey==",
      },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Invalid email or authkey");
  });

  it("should return 500 when database error occurs", async () => {
    prismaMock.user.findUnique.mockRejectedValue(new Error("Database error"));

    const request = createMockRequest({
      method: "POST",
      body: {
        email: "test@example.com",
        authkey: "authkey123==",
      },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to login");
  });
});
