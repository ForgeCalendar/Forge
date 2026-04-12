import { generateSalt, hashAuthkey, verifyAuthkey } from "@/lib/crypto/server";

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

describe("hashAuthkey", () => {
  it("should hash an authkey", async () => {
    const authkey = "mySecretAuthKey123";
    const hash = await hashAuthkey(authkey);

    expect(hash).toBeDefined();
    expect(typeof hash).toBe("string");
    expect(hash.length).toBeGreaterThan(0);
  });

  it("should produce bcrypt hash format", async () => {
    const authkey = "testAuthKey";
    const hash = await hashAuthkey(authkey);

    // Bcrypt hashes start with $2a$, $2b$, or $2y$
    expect(hash).toMatch(/^\$2[aby]\$/);
  });

  it("should produce different hashes for the same authkey", async () => {
    const authkey = "sameAuthKey";
    const hash1 = await hashAuthkey(authkey);
    const hash2 = await hashAuthkey(authkey);

    // Bcrypt uses random salts, so hashes should be different
    expect(hash1).not.toBe(hash2);
  });

  it("should produce different hashes for different authkeys", async () => {
    const hash1 = await hashAuthkey("authkey1");
    const hash2 = await hashAuthkey("authkey2");

    expect(hash1).not.toBe(hash2);
  });

  it("should handle empty string", async () => {
    const hash = await hashAuthkey("");

    expect(hash).toBeDefined();
    expect(typeof hash).toBe("string");
  });

  it("should handle long authkeys", async () => {
    const longAuthkey = "a".repeat(1000);
    const hash = await hashAuthkey(longAuthkey);

    expect(hash).toBeDefined();
    expect(typeof hash).toBe("string");
  });

  it("should handle unicode characters", async () => {
    const unicodeAuthkey = "密鑰🔑authkey";
    const hash = await hashAuthkey(unicodeAuthkey);

    expect(hash).toBeDefined();
    expect(typeof hash).toBe("string");
  });

  it("should handle special characters", async () => {
    const specialAuthkey = "!@#$%^&*()_+-=[]{}|;':\",./<>?";
    const hash = await hashAuthkey(specialAuthkey);

    expect(hash).toBeDefined();
    expect(typeof hash).toBe("string");
  });
});

describe("verifyAuthkey", () => {
  it("should verify correct authkey", async () => {
    const authkey = "myAuthKey123";
    const hash = await hashAuthkey(authkey);
    const isValid = await verifyAuthkey(authkey, hash);

    expect(isValid).toBe(true);
  });

  it("should reject incorrect authkey", async () => {
    const authkey = "correctAuthKey";
    const hash = await hashAuthkey(authkey);
    const isValid = await verifyAuthkey("wrongAuthKey", hash);

    expect(isValid).toBe(false);
  });

  it("should handle empty string authkey", async () => {
    const hash = await hashAuthkey("");
    const isValid = await verifyAuthkey("", hash);

    expect(isValid).toBe(true);
  });

  it("should reject empty string when hash is for non-empty authkey", async () => {
    const hash = await hashAuthkey("notEmpty");
    const isValid = await verifyAuthkey("", hash);

    expect(isValid).toBe(false);
  });

  it("should handle long authkeys", async () => {
    const longAuthkey = "b".repeat(1000);
    const hash = await hashAuthkey(longAuthkey);
    const isValid = await verifyAuthkey(longAuthkey, hash);

    expect(isValid).toBe(true);
  });

  it("should handle unicode characters", async () => {
    const unicodeAuthkey = "密鑰🔑key";
    const hash = await hashAuthkey(unicodeAuthkey);
    const isValid = await verifyAuthkey(unicodeAuthkey, hash);

    expect(isValid).toBe(true);
  });

  it("should handle special characters", async () => {
    const specialAuthkey = "!@#$%^&*()_+-=[]{}|;':\",./<>?";
    const hash = await hashAuthkey(specialAuthkey);
    const isValid = await verifyAuthkey(specialAuthkey, hash);

    expect(isValid).toBe(true);
  });

  it("should be case-sensitive", async () => {
    const authkey = "CaseSensitive";
    const hash = await hashAuthkey(authkey);

    expect(await verifyAuthkey("CaseSensitive", hash)).toBe(true);
    expect(await verifyAuthkey("casesensitive", hash)).toBe(false);
    expect(await verifyAuthkey("CASESENSITIVE", hash)).toBe(false);
  });

  it("should reject similar but different authkeys", async () => {
    const hash = await hashAuthkey("authkey123");

    expect(await verifyAuthkey("authkey123", hash)).toBe(true);
    expect(await verifyAuthkey("authkey124", hash)).toBe(false);
    expect(await verifyAuthkey("authkey12", hash)).toBe(false);
    expect(await verifyAuthkey("authkey1234", hash)).toBe(false);
  });

  it("should reject invalid hash format", async () => {
    const authkey = "testKey";
    const invalidHash = "not-a-valid-bcrypt-hash";

    // bcrypt.compare returns false for invalid hashes instead of throwing
    const isValid = await verifyAuthkey(authkey, invalidHash);
    expect(isValid).toBe(false);
  });
});

describe("hashAuthkey and verifyAuthkey integration", () => {
  it("should work together for authentication flow", async () => {
    // Simulate user creating an authkey
    const userAuthkey = "userGeneratedAuthKey123";

    // Hash it for storage
    const storedHash = await hashAuthkey(userAuthkey);

    // Later, verify the authkey
    const isAuthenticated = await verifyAuthkey(userAuthkey, storedHash);
    expect(isAuthenticated).toBe(true);

    // Wrong authkey should fail
    const wrongAuth = await verifyAuthkey("wrongKey", storedHash);
    expect(wrongAuth).toBe(false);
  });

  it("should handle multiple different authkeys", async () => {
    const authkeys = [
      "key1",
      "key2",
      "key3",
      "veryLongKeyWithSpecialChars!@#$",
      "短いキー",
    ];

    const hashes = await Promise.all(authkeys.map((key) => hashAuthkey(key)));

    // All hashes should be unique
    const uniqueHashes = new Set(hashes);
    expect(uniqueHashes.size).toBe(authkeys.length);

    // Each authkey should verify against its own hash
    for (let i = 0; i < authkeys.length; i++) {
      const isValid = await verifyAuthkey(authkeys[i], hashes[i]);
      expect(isValid).toBe(true);
    }

    // Each authkey should NOT verify against other hashes
    for (let i = 0; i < authkeys.length; i++) {
      for (let j = 0; j < hashes.length; j++) {
        if (i !== j) {
          const isValid = await verifyAuthkey(authkeys[i], hashes[j]);
          expect(isValid).toBe(false);
        }
      }
    }
  });
});
