import bcrypt from "bcryptjs";
import { hashPassword, verifyPassword, setAuthCookie, getCurrentUser } from "@/lib/auth";
import { prismaMock } from "@/__tests__/utils/prisma-mock";
import { mockUser } from "@/__tests__/utils/test-helpers";

// Mock bcryptjs
jest.mock("bcryptjs", () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

const mockCookieSet = jest.fn();
const mockCookieDelete = jest.fn();
let mockCookieStore: Record<string, string> = {};

jest.mock("next/headers", () => ({
  cookies: jest.fn(() =>
    Promise.resolve({
      set: (name: string, value: string) => {
        mockCookieSet(name, value);
        mockCookieStore[name] = value;
      },
      delete: mockCookieDelete,
      get: (name: string) =>
        mockCookieStore[name]
          ? { name, value: mockCookieStore[name] }
          : undefined,
    })
  ),
}));

describe("Auth Utilities", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("hashPassword", () => {
    it("should hash a password with correct salt rounds", async () => {
      const password = "mySecurePassword123";
      const hashedPassword = "$2a$10$hashedPasswordString";

      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);

      const result = await hashPassword(password);

      expect(result).toBe(hashedPassword);
      expect(bcrypt.hash).toHaveBeenCalledWith(password, 10);
    });

    it("should handle hashing errors", async () => {
      const password = "password123";

      (bcrypt.hash as jest.Mock).mockRejectedValue(new Error("Hashing failed"));

      await expect(hashPassword(password)).rejects.toThrow("Hashing failed");
    });
  });

  describe("verifyPassword", () => {
    it("should return true when password matches hash", async () => {
      const password = "myPassword123";
      const hash = "$2a$10$correctHashString";

      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await verifyPassword(password, hash);

      expect(result).toBe(true);
      expect(bcrypt.compare).toHaveBeenCalledWith(password, hash);
    });

    it("should return false when password does not match hash", async () => {
      const password = "wrongPassword";
      const hash = "$2a$10$correctHashString";

      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await verifyPassword(password, hash);

      expect(result).toBe(false);
      expect(bcrypt.compare).toHaveBeenCalledWith(password, hash);
    });

    it("should handle verification errors", async () => {
      const password = "password123";
      const hash = "$2a$10$hashString";

      (bcrypt.compare as jest.Mock).mockRejectedValue(
        new Error("Comparison failed")
      );

      await expect(verifyPassword(password, hash)).rejects.toThrow(
        "Comparison failed"
      );
    });
  });

  describe("Cookie signing", () => {
    const ORIGINAL_ENV = process.env;

    beforeEach(() => {
      process.env = { ...ORIGINAL_ENV, COOKIE_SECRET: "test-secret-key" };
      mockCookieStore = {};
      mockCookieSet.mockClear();
      mockCookieDelete.mockClear();
    });

    afterEach(() => {
      process.env = ORIGINAL_ENV;
    });

    it("should round-trip a signed cookie through setAuthCookie and getCurrentUser", async () => {
      prismaMock.user.findUnique.mockResolvedValue(mockUser);

      await setAuthCookie("test@example.com");

      expect(mockCookieSet).toHaveBeenCalledWith(
        "session_user_email",
        expect.stringContaining("test@example.com")
      );

      const email = await getCurrentUser();
      expect(email).toBe("test@example.com");
    });

    it("should return null for a tampered cookie value", async () => {
      await setAuthCookie("test@example.com");

      // Tamper with the stored cookie value
      mockCookieStore["session_user_email"] = "test@example.com.invalidsig";

      const email = await getCurrentUser();
      expect(email).toBeNull();
    });

    it("should return null when cookie is missing", async () => {
      const email = await getCurrentUser();
      expect(email).toBeNull();
    });

    it("should throw when COOKIE_SECRET is not set", async () => {
      delete process.env.COOKIE_SECRET;

      await expect(setAuthCookie("test@example.com")).rejects.toThrow(
        "COOKIE_SECRET environment variable is required for secure sessions"
      );
    });
  });
});
