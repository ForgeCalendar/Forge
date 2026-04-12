import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";

const BCRYPT_ROUNDS = 10;

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

/**
 * Hashes an authkey using bcrypt.
 * This function should only be run on the server.
 *
 * @param authkey - The authkey to hash
 * @returns A promise that resolves to the bcrypt hash
 */
export async function hashAuthkey(authkey: string): Promise<string> {
  return bcrypt.hash(authkey, BCRYPT_ROUNDS);
}

/**
 * Verifies an authkey against a bcrypt hash.
 * This function should only be run on the server.
 *
 * @param authkey - The authkey to verify
 * @param hash - The bcrypt hash to verify against
 * @returns A promise that resolves to true if the authkey matches, false otherwise
 */
export async function verifyAuthkey(
  authkey: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(authkey, hash);
}
