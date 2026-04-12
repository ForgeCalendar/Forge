import { POST } from "@/app/api/auth/register/route";
import { prismaMock } from "@/__tests__/utils/prisma-mock";
import { createMockRequest, mockUser } from "@/__tests__/utils/test-helpers";
import * as auth from "@/lib/auth";
import * as cryptoServer from "@/lib/crypto/server";

jest.mock("@/lib/auth", () => ({
  hashPassword: jest.fn(),
  setAuthCookie: jest.fn(),
}));

jest.mock("@/lib/crypto/server", () => ({
  generateSalt: jest.fn(),
}));

describe("POST /api/auth/register", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should register a new user successfully and create salts for all purposes", async () => {
    const mockHashedPassword = "$2a$10$hashedpassword";
    const mockSalt = "mockGeneratedSalt123==";

    (auth.hashPassword as jest.Mock).mockResolvedValue(mockHashedPassword);
    (auth.setAuthCookie as jest.Mock).mockResolvedValue(undefined);
    (cryptoServer.generateSalt as jest.Mock).mockReturnValue(mockSalt);

    prismaMock.user.findUnique.mockResolvedValue(null);

    // Mock transaction to execute the callback
    prismaMock.$transaction.mockImplementation(async (callback) => {
      const txMock = {
        user: {
          create: jest.fn().mockResolvedValue(mockUser),
        },
        userSalt: {
          create: jest.fn().mockResolvedValue({
            id: "salt-id",
            userId: mockUser.id,
            purpose: "authentication",
            salt: mockSalt,
            createdAt: new Date(),
            updatedAt: new Date(),
          }),
        },
      };
      return callback(txMock);
    });

    const request = createMockRequest({
      method: "POST",
      body: {
        email: "test@example.com",
        password: "password123",
      },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.message).toBe("User registered successfully");
    expect(data.user.email).toBe("test@example.com");
    expect(auth.hashPassword).toHaveBeenCalledWith("password123");
    expect(auth.setAuthCookie).toHaveBeenCalledWith("test@example.com");

    // Verify transaction was called
    expect(prismaMock.$transaction).toHaveBeenCalled();

    // Verify generateSalt was called for each purpose (authentication and apikey)
    expect(cryptoServer.generateSalt).toHaveBeenCalledTimes(2);
  });

  it("should return 400 when email is missing", async () => {
    const request = createMockRequest({
      method: "POST",
      body: {
        password: "password123",
      },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Email and password are required");
  });

  it("should return 400 when password is missing", async () => {
    const request = createMockRequest({
      method: "POST",
      body: {
        email: "test@example.com",
      },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Email and password are required");
  });

  it("should return 400 when email format is invalid", async () => {
    const request = createMockRequest({
      method: "POST",
      body: {
        email: "invalid-email",
        password: "password123",
      },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid email format");
  });

  it("should return 400 when password is less than 8 characters", async () => {
    const request = createMockRequest({
      method: "POST",
      body: {
        email: "test@example.com",
        password: "short",
      },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Password must be at least 8 characters long");
  });

  it("should return 409 when user already exists", async () => {
    prismaMock.user.findUnique.mockResolvedValue(mockUser);

    const request = createMockRequest({
      method: "POST",
      body: {
        email: "test@example.com",
        password: "password123",
      },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(409);
    expect(data.error).toBe("User with this email already exists");
  });

  it("should return 500 when database error occurs", async () => {
    prismaMock.user.findUnique.mockRejectedValue(new Error("Database error"));

    const request = createMockRequest({
      method: "POST",
      body: {
        email: "test@example.com",
        password: "password123",
      },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to register user");
  });
});
