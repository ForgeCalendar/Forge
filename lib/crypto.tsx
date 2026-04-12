/**
 * Derives a cryptographic key from a password, salt, and purpose string.
 * Different purpose strings will produce different keys from the same password.
 *
 * @param password - The user's password
 * @param salt - A salt value (should be unique per user, typically stored)
 * @param purpose - A purpose string (e.g., "encryption", "authentication", "signing")
 * @param iterations - Number of PBKDF2 iterations (default: 100000)
 * @returns A CryptoKey that can be used for cryptographic operations
 */
export async function deriveKey(
  password: string,
  salt: string,
  purpose: string,
  iterations: number = 100000
): Promise<CryptoKey> {
  // Encode the password
  const encoder = new TextEncoder();
  const passwordData = encoder.encode(password);

  // Combine salt and purpose to ensure different purposes yield different keys
  const saltWithPurpose = encoder.encode(`${salt}:${purpose}`);

  // Import the password as a key for PBKDF2
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    passwordData,
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  // Derive the actual key using PBKDF2
  const derivedKey = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: saltWithPurpose,
      iterations: iterations,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    true, // extractable
    ["encrypt", "decrypt"]
  );

  return derivedKey;
}

/**
 * Encrypts a plaintext string using AES-GCM encryption.
 *
 * @param key - A CryptoKey (e.g., from deriveKey) for encryption
 * @param plaintext - The text to encrypt
 * @returns A base64-encoded string containing the IV and ciphertext
 */
export async function encrypt(
  key: CryptoKey,
  plaintext: string
): Promise<string> {
  // Generate a random 12-byte IV (recommended for AES-GCM)
  const iv = crypto.getRandomValues(new Uint8Array(12));

  // Encode the plaintext
  const encoder = new TextEncoder();
  const plaintextData = encoder.encode(plaintext);

  // Encrypt the data
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    plaintextData
  );

  // Combine IV and ciphertext: [IV (12 bytes)][ciphertext]
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), iv.length);

  // Return as base64 for easy storage/transmission
  return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypts a ciphertext string that was encrypted with the encrypt function.
 *
 * @param key - A CryptoKey (e.g., from deriveKey) for decryption
 * @param ciphertext - A base64-encoded string containing the IV and ciphertext
 * @returns The decrypted plaintext string
 */
export async function decrypt(
  key: CryptoKey,
  ciphertext: string
): Promise<string> {
  // Decode from base64
  const combined = Uint8Array.from(atob(ciphertext), (c) => c.charCodeAt(0));

  // Extract IV (first 12 bytes) and ciphertext (remaining bytes)
  const iv = combined.slice(0, 12);
  const encryptedData = combined.slice(12);

  // Decrypt the data
  const decryptedData = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    encryptedData
  );

  // Decode and return the plaintext
  const decoder = new TextDecoder();
  return decoder.decode(decryptedData);
}
