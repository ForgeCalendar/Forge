import { randomBytes } from "crypto";

/**
 * Generates a cryptographically secure random salt.
 * This function should only be run on the server.
 *
 * @param byteLength - The length of the salt in bytes (default: 32 bytes = 256 bits)
 * @returns A base64-encoded salt string
 */
export function generateSalt(byteLength: number = 32): string {
  const salt = randomBytes(byteLength);
  return salt.toString("base64");
}
