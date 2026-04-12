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
