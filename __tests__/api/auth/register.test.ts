import { POST } from "@/app/api/auth/register/route";
import { prismaMock } from "@/__tests__/utils/prisma-mock";
import { createMockRequest, mockUser } from "@/__tests__/utils/test-helpers";
import * as auth from "@/lib/auth";

jest.mock("@/lib/auth", () => ({
  hashPassword: jest.fn(),
  setAuthCookie: jest.fn(),
}));

describe("POST /api/auth/register", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should register a new user successfully with provided salt", async () => {
    const mockHashedPassword = "$2a$10$hashedpassword";
    const mockSalt = "mockClientGeneratedSalt123==";

    (auth.hashPassword as jest.Mock).mockResolvedValue(mockHashedPassword);
    (auth.setAuthCookie as jest.Mock).mockResolvedValue(undefined);

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
        salt: mockSalt,
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
  });

  it("should return 400 when email is missing", async () => {
    const request = createMockRequest({
      method: "POST",
      body: {
        password: "password123",
        salt: "someSalt==",
      },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Email, password, and salt are required");
  });

  it("should return 400 when password is missing", async () => {
    const request = createMockRequest({
      method: "POST",
      body: {
        email: "test@example.com",
        salt: "someSalt==",
      },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Email, password, and salt are required");
  });

  it("should return 400 when salt is missing", async () => {
    const request = createMockRequest({
      method: "POST",
      body: {
        email: "test@example.com",
        password: "password123",
      },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Email, password, and salt are required");
  });

  it("should return 400 when email format is invalid", async () => {
    const request = createMockRequest({
      method: "POST",
      body: {
        email: "invalid-email",
        password: "password123",
        salt: "someSalt==",
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
        salt: "someSalt==",
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
        salt: "someSalt==",
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
        salt: "someSalt==",
      },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to register user");
  });
});
