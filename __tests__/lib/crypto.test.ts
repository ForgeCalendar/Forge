import { deriveKey, encrypt, decrypt } from "@/lib/crypto";

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

describe("encrypt", () => {
  let testKey: CryptoKey;

  beforeEach(async () => {
    testKey = await deriveKey("testPassword", "testSalt", "encryption");
  });

  it("should encrypt plaintext successfully", async () => {
    const plaintext = "Hello, World!";
    const ciphertext = await encrypt(testKey, plaintext);

    expect(ciphertext).toBeDefined();
    expect(typeof ciphertext).toBe("string");
    expect(ciphertext.length).toBeGreaterThan(0);
  });

  it("should produce different ciphertext for each encryption (due to random IV)", async () => {
    const plaintext = "Same message";
    const ciphertext1 = await encrypt(testKey, plaintext);
    const ciphertext2 = await encrypt(testKey, plaintext);

    // Should be different because of random IV
    expect(ciphertext1).not.toBe(ciphertext2);
  });

  it("should return base64-encoded string", async () => {
    const plaintext = "Test message";
    const ciphertext = await encrypt(testKey, plaintext);

    // Should be valid base64
    expect(() => atob(ciphertext)).not.toThrow();
  });

  it("should handle empty string", async () => {
    const plaintext = "";
    const ciphertext = await encrypt(testKey, plaintext);

    expect(ciphertext).toBeDefined();
    expect(typeof ciphertext).toBe("string");
  });

  it("should handle long strings", async () => {
    const plaintext = "A".repeat(10000);
    const ciphertext = await encrypt(testKey, plaintext);

    expect(ciphertext).toBeDefined();
    expect(typeof ciphertext).toBe("string");
  });

  it("should handle unicode characters", async () => {
    const plaintext = "Hello 世界 🌍 مرحبا";
    const ciphertext = await encrypt(testKey, plaintext);

    expect(ciphertext).toBeDefined();
    expect(typeof ciphertext).toBe("string");
  });

  it("should handle special characters", async () => {
    const plaintext = "Special: !@#$%^&*()_+-=[]{}|;':\",./<>?";
    const ciphertext = await encrypt(testKey, plaintext);

    expect(ciphertext).toBeDefined();
    expect(typeof ciphertext).toBe("string");
  });

  it("should handle newlines and tabs", async () => {
    const plaintext = "Line 1\nLine 2\tTabbed";
    const ciphertext = await encrypt(testKey, plaintext);

    expect(ciphertext).toBeDefined();
    expect(typeof ciphertext).toBe("string");
  });
});

describe("decrypt", () => {
  let testKey: CryptoKey;

  beforeEach(async () => {
    testKey = await deriveKey("testPassword", "testSalt", "encryption");
  });

  it("should decrypt ciphertext successfully", async () => {
    const plaintext = "Hello, World!";
    const ciphertext = await encrypt(testKey, plaintext);
    const decrypted = await decrypt(testKey, ciphertext);

    expect(decrypted).toBe(plaintext);
  });

  it("should handle empty string", async () => {
    const plaintext = "";
    const ciphertext = await encrypt(testKey, plaintext);
    const decrypted = await decrypt(testKey, ciphertext);

    expect(decrypted).toBe(plaintext);
  });

  it("should handle long strings", async () => {
    const plaintext = "B".repeat(10000);
    const ciphertext = await encrypt(testKey, plaintext);
    const decrypted = await decrypt(testKey, ciphertext);

    expect(decrypted).toBe(plaintext);
  });

  it("should handle unicode characters", async () => {
    const plaintext = "Hello 世界 🌍 مرحبا";
    const ciphertext = await encrypt(testKey, plaintext);
    const decrypted = await decrypt(testKey, ciphertext);

    expect(decrypted).toBe(plaintext);
  });

  it("should handle special characters", async () => {
    const plaintext = "Special: !@#$%^&*()_+-=[]{}|;':\",./<>?";
    const ciphertext = await encrypt(testKey, plaintext);
    const decrypted = await decrypt(testKey, ciphertext);

    expect(decrypted).toBe(plaintext);
  });

  it("should handle newlines and tabs", async () => {
    const plaintext = "Line 1\nLine 2\tTabbed";
    const ciphertext = await encrypt(testKey, plaintext);
    const decrypted = await decrypt(testKey, ciphertext);

    expect(decrypted).toBe(plaintext);
  });

  it("should handle JSON strings", async () => {
    const plaintext = JSON.stringify({ name: "John", age: 30, active: true });
    const ciphertext = await encrypt(testKey, plaintext);
    const decrypted = await decrypt(testKey, ciphertext);

    expect(decrypted).toBe(plaintext);
    expect(JSON.parse(decrypted)).toEqual({
      name: "John",
      age: 30,
      active: true,
    });
  });

  it("should fail to decrypt with wrong key", async () => {
    const plaintext = "Secret message";
    const ciphertext = await encrypt(testKey, plaintext);

    // Create a different key
    const wrongKey = await deriveKey("wrongPassword", "testSalt", "encryption");

    // Should throw an error when trying to decrypt with wrong key
    await expect(decrypt(wrongKey, ciphertext)).rejects.toThrow();
  });

  it("should fail to decrypt tampered ciphertext", async () => {
    const plaintext = "Secret message";
    const ciphertext = await encrypt(testKey, plaintext);

    // Tamper with the ciphertext
    const tamperedCiphertext = ciphertext.slice(0, -5) + "XXXXX";

    // Should throw an error when trying to decrypt tampered data
    await expect(decrypt(testKey, tamperedCiphertext)).rejects.toThrow();
  });

  it("should fail to decrypt invalid base64", async () => {
    const invalidCiphertext = "not-valid-base64!!!";

    // Should throw an error
    await expect(decrypt(testKey, invalidCiphertext)).rejects.toThrow();
  });
});

describe("encrypt/decrypt integration", () => {
  it("should work with keys derived for different purposes", async () => {
    const password = "userPassword123";
    const salt = "randomUserSalt";

    // Derive keys for different purposes
    const encryptionKey = await deriveKey(password, salt, "data-encryption");
    const authKey = await deriveKey(password, salt, "authentication");

    const plaintext = "Sensitive user data";

    // Encrypt with encryption key
    const ciphertext = await encrypt(encryptionKey, plaintext);

    // Decrypt with encryption key should work
    const decrypted = await decrypt(encryptionKey, ciphertext);
    expect(decrypted).toBe(plaintext);

    // Decrypt with auth key should fail
    await expect(decrypt(authKey, ciphertext)).rejects.toThrow();
  });

  it("should support multiple encryptions with same key", async () => {
    const key = await deriveKey("password", "salt", "encryption");

    const messages = [
      "First message",
      "Second message",
      "Third message",
      "Fourth message",
    ];

    const ciphertexts = await Promise.all(
      messages.map((msg) => encrypt(key, msg))
    );

    // All ciphertexts should be different (random IVs)
    const uniqueCiphertexts = new Set(ciphertexts);
    expect(uniqueCiphertexts.size).toBe(messages.length);

    // All should decrypt correctly
    const decrypted = await Promise.all(
      ciphertexts.map((ct) => decrypt(key, ct))
    );

    expect(decrypted).toEqual(messages);
  });

  it("should handle round-trip encryption/decryption", async () => {
    const key = await deriveKey("myPassword", "mySalt", "test");

    const testCases = [
      "",
      "a",
      "Hello, World!",
      "The quick brown fox jumps over the lazy dog",
      "1234567890",
      "Special chars: !@#$%^&*()",
      "Unicode: 你好世界 🚀",
      '{"json": true, "nested": {"value": 42}}',
      "\n\t\r",
      "A".repeat(1000),
    ];

    for (const plaintext of testCases) {
      const ciphertext = await encrypt(key, plaintext);
      const decrypted = await decrypt(key, ciphertext);
      expect(decrypted).toBe(plaintext);
    }
  });
});
