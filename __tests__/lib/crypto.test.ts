import { deriveKey } from "@/lib/crypto";

describe("deriveKey", () => {
  const testPassword = "testPassword123";
  const testSalt = "randomSalt123";
  const testPurpose = "encryption";

  beforeEach(() => {
    // Ensure Web Crypto API is available
    if (!global.crypto?.subtle) {
      throw new Error("Web Crypto API is not available in test environment");
    }
  });

  it("should successfully derive a key", async () => {
    const key = await deriveKey(testPassword, testSalt, testPurpose);

    expect(key).toBeDefined();
    expect(key).toBeInstanceOf(CryptoKey);
  });

  it("should derive a key with correct algorithm and properties", async () => {
    const key = await deriveKey(testPassword, testSalt, testPurpose);

    expect(key.type).toBe("secret");
    expect(key.extractable).toBe(true);
    expect(key.algorithm.name).toBe("AES-GCM");
    expect((key.algorithm as AesKeyAlgorithm).length).toBe(256);
    expect(key.usages).toContain("encrypt");
    expect(key.usages).toContain("decrypt");
  });

  it("should produce different keys for different purposes", async () => {
    const key1 = await deriveKey(testPassword, testSalt, "encryption");
    const key2 = await deriveKey(testPassword, testSalt, "authentication");

    // Export both keys to compare them
    const rawKey1 = await crypto.subtle.exportKey("raw", key1);
    const rawKey2 = await crypto.subtle.exportKey("raw", key2);

    expect(new Uint8Array(rawKey1)).not.toEqual(new Uint8Array(rawKey2));
  });

  it("should produce the same key for identical inputs", async () => {
    const key1 = await deriveKey(testPassword, testSalt, testPurpose);
    const key2 = await deriveKey(testPassword, testSalt, testPurpose);

    // Export both keys to compare them
    const rawKey1 = await crypto.subtle.exportKey("raw", key1);
    const rawKey2 = await crypto.subtle.exportKey("raw", key2);

    expect(new Uint8Array(rawKey1)).toEqual(new Uint8Array(rawKey2));
  });

  it("should produce different keys for different passwords", async () => {
    const key1 = await deriveKey("password1", testSalt, testPurpose);
    const key2 = await deriveKey("password2", testSalt, testPurpose);

    const rawKey1 = await crypto.subtle.exportKey("raw", key1);
    const rawKey2 = await crypto.subtle.exportKey("raw", key2);

    expect(new Uint8Array(rawKey1)).not.toEqual(new Uint8Array(rawKey2));
  });

  it("should produce different keys for different salts", async () => {
    const key1 = await deriveKey(testPassword, "salt1", testPurpose);
    const key2 = await deriveKey(testPassword, "salt2", testPurpose);

    const rawKey1 = await crypto.subtle.exportKey("raw", key1);
    const rawKey2 = await crypto.subtle.exportKey("raw", key2);

    expect(new Uint8Array(rawKey1)).not.toEqual(new Uint8Array(rawKey2));
  });

  it("should respect custom iteration count", async () => {
    // Test with different iteration counts
    const key1 = await deriveKey(testPassword, testSalt, testPurpose, 50000);
    const key2 = await deriveKey(testPassword, testSalt, testPurpose, 150000);

    const rawKey1 = await crypto.subtle.exportKey("raw", key1);
    const rawKey2 = await crypto.subtle.exportKey("raw", key2);

    // Different iteration counts should produce different keys
    expect(new Uint8Array(rawKey1)).not.toEqual(new Uint8Array(rawKey2));
  });

  it("should use default iterations when not specified", async () => {
    const keyWithDefault = await deriveKey(testPassword, testSalt, testPurpose);
    const keyWithExplicit = await deriveKey(
      testPassword,
      testSalt,
      testPurpose,
      100000
    );

    const rawKey1 = await crypto.subtle.exportKey("raw", keyWithDefault);
    const rawKey2 = await crypto.subtle.exportKey("raw", keyWithExplicit);

    // Should produce the same key since default is 100000
    expect(new Uint8Array(rawKey1)).toEqual(new Uint8Array(rawKey2));
  });

  it("should handle empty purpose string", async () => {
    const key = await deriveKey(testPassword, testSalt, "");

    expect(key).toBeDefined();
    expect(key).toBeInstanceOf(CryptoKey);
  });

  it("should handle special characters in purpose", async () => {
    const key = await deriveKey(testPassword, testSalt, "auth:v2:encryption");

    expect(key).toBeDefined();
    expect(key).toBeInstanceOf(CryptoKey);
  });

  it("should handle long passwords", async () => {
    const longPassword = "a".repeat(1000);
    const key = await deriveKey(longPassword, testSalt, testPurpose);

    expect(key).toBeDefined();
    expect(key).toBeInstanceOf(CryptoKey);
  });

  it("should handle long salt values", async () => {
    const longSalt = "s".repeat(1000);
    const key = await deriveKey(testPassword, longSalt, testPurpose);

    expect(key).toBeDefined();
    expect(key).toBeInstanceOf(CryptoKey);
  });

  it("should handle unicode characters in password", async () => {
    const unicodePassword = "密碼🔐test";
    const key = await deriveKey(unicodePassword, testSalt, testPurpose);

    expect(key).toBeDefined();
    expect(key).toBeInstanceOf(CryptoKey);
  });

  it("should handle unicode characters in salt", async () => {
    const unicodeSalt = "鹽值🧂salt";
    const key = await deriveKey(testPassword, unicodeSalt, testPurpose);

    expect(key).toBeDefined();
    expect(key).toBeInstanceOf(CryptoKey);
  });

  it("should produce different keys for different combinations of salt and purpose", async () => {
    // These should all be different
    const key1 = await deriveKey(testPassword, "salt1", "purpose1");
    const key2 = await deriveKey(testPassword, "salt1", "purpose2");
    const key3 = await deriveKey(testPassword, "salt2", "purpose1");
    const key4 = await deriveKey(testPassword, "salt2", "purpose2");

    const rawKeys = await Promise.all([
      crypto.subtle.exportKey("raw", key1),
      crypto.subtle.exportKey("raw", key2),
      crypto.subtle.exportKey("raw", key3),
      crypto.subtle.exportKey("raw", key4),
    ]);

    const uint8Arrays = rawKeys.map((k) => new Uint8Array(k));

    // Compare all pairs to ensure they're different
    for (let i = 0; i < uint8Arrays.length; i++) {
      for (let j = i + 1; j < uint8Arrays.length; j++) {
        expect(uint8Arrays[i]).not.toEqual(uint8Arrays[j]);
      }
    }
  });

  it("should derive keys that can be used for encryption/decryption", async () => {
    const key = await deriveKey(testPassword, testSalt, "encryption");
    const testData = new TextEncoder().encode("Hello, World!");
    const iv = crypto.getRandomValues(new Uint8Array(12));

    // Test encryption
    const encrypted = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      testData
    );

    expect(encrypted).toBeDefined();
    expect(encrypted.byteLength).toBeGreaterThan(0);

    // Test decryption
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      encrypted
    );

    const decryptedText = new TextDecoder().decode(decrypted);
    expect(decryptedText).toBe("Hello, World!");
  });
});
