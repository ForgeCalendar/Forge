import { generateSalt } from "@/lib/crypto/server";

describe("generateSalt", () => {
  it("should generate a salt", () => {
    const salt = generateSalt();

    expect(salt).toBeDefined();
    expect(typeof salt).toBe("string");
    expect(salt.length).toBeGreaterThan(0);
  });

  it("should generate a base64-encoded string", () => {
    const salt = generateSalt();

    // Should be valid base64
    expect(() => Buffer.from(salt, "base64")).not.toThrow();

    // Decode and check it's the right length (default 32 bytes)
    const decoded = Buffer.from(salt, "base64");
    expect(decoded.length).toBe(32);
  });

  it("should generate different salts each time", () => {
    const salt1 = generateSalt();
    const salt2 = generateSalt();
    const salt3 = generateSalt();

    expect(salt1).not.toBe(salt2);
    expect(salt2).not.toBe(salt3);
    expect(salt1).not.toBe(salt3);
  });

  it("should generate unique salts in a large batch", () => {
    const salts = new Set<string>();
    const count = 1000;

    for (let i = 0; i < count; i++) {
      salts.add(generateSalt());
    }

    // All salts should be unique
    expect(salts.size).toBe(count);
  });

  it("should respect custom byte length", () => {
    const salt16 = generateSalt(16);
    const salt32 = generateSalt(32);
    const salt64 = generateSalt(64);

    const decoded16 = Buffer.from(salt16, "base64");
    const decoded32 = Buffer.from(salt32, "base64");
    const decoded64 = Buffer.from(salt64, "base64");

    expect(decoded16.length).toBe(16);
    expect(decoded32.length).toBe(32);
    expect(decoded64.length).toBe(64);
  });

  it("should handle small byte lengths", () => {
    const salt = generateSalt(8);
    const decoded = Buffer.from(salt, "base64");

    expect(decoded.length).toBe(8);
  });

  it("should handle large byte lengths", () => {
    const salt = generateSalt(256);
    const decoded = Buffer.from(salt, "base64");

    expect(decoded.length).toBe(256);
  });

  it("should use default of 32 bytes when not specified", () => {
    const saltDefault = generateSalt();
    const saltExplicit = generateSalt(32);

    const decodedDefault = Buffer.from(saltDefault, "base64");
    const decodedExplicit = Buffer.from(saltExplicit, "base64");

    expect(decodedDefault.length).toBe(32);
    expect(decodedExplicit.length).toBe(32);
  });

  it("should generate cryptographically random salts", () => {
    const salts = [];
    for (let i = 0; i < 100; i++) {
      salts.push(generateSalt());
    }

    // Check that there are no duplicates
    const uniqueSalts = new Set(salts);
    expect(uniqueSalts.size).toBe(salts.length);

    // Check that all salts have expected length
    salts.forEach((salt) => {
      const decoded = Buffer.from(salt, "base64");
      expect(decoded.length).toBe(32);
    });
  });

  it("should handle edge case of 1 byte", () => {
    const salt = generateSalt(1);
    const decoded = Buffer.from(salt, "base64");

    expect(decoded.length).toBe(1);
    expect(salt.length).toBeGreaterThan(0);
  });
});
