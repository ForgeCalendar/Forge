/**
 * Client-side API key storage with encryption
 * Keys are stored in sessionStorage (cleared on browser close)
 * and encrypted using the user's chatapi key (derived from password + salt)
 */

import { encrypt, decrypt, deriveKey } from "@/lib/crypto/client";

/**
 * Get the chatapi encryption key by deriving it from stored password and salt.
 * Password and salt are stored in sessionStorage after login/registration.
 *
 * @returns CryptoKey or null if not logged in
 */
export async function getChatApiKey(): Promise<CryptoKey | null> {
  const password = sessionStorage.getItem("user_password");
  const salt = sessionStorage.getItem("user_salt");

  console.log(`[getChatApiKey] user_password exists:`, password ? "YES" : "NO");
  console.log(`[getChatApiKey] user_salt exists:`, salt ? "YES" : "NO");

  if (!password || !salt) {
    console.log(
      `[getChatApiKey] Missing password or salt in sessionStorage - user not logged in`
    );
    return null;
  }

  try {
    // Derive the chatapi key from password + salt
    const chatApiKey = await deriveKey(password, salt, "chatapi");
    console.log(`[getChatApiKey] Successfully derived chatapi key`);
    return chatApiKey;
  } catch (error) {
    console.error("[getChatApiKey] Failed to derive chatapi key:", error);
    return null;
  }
}

/**
 * Save an encrypted API key to sessionStorage.
 *
 * @param provider - Provider identifier (e.g., "anthropic", "openai")
 * @param apiKey - The API key to encrypt and store
 */
export async function saveApiKey(
  provider: string,
  apiKey: string
): Promise<void> {
  console.log(
    `[saveApiKey] Saving key for provider: ${provider}, key length: ${apiKey.length}`
  );

  const chatApiKey = await getChatApiKey();
  console.log(
    `[saveApiKey] Chat API key retrieved:`,
    chatApiKey ? "YES" : "NO"
  );

  if (!chatApiKey) {
    console.error(`[saveApiKey] No user credentials found in sessionStorage`);
    throw new Error("Not logged in - please log in first");
  }

  const encrypted = await encrypt(chatApiKey, apiKey);
  console.log(
    `[saveApiKey] Encrypted successfully, storing as apikey_${provider}`
  );

  sessionStorage.setItem(`apikey_${provider}`, encrypted);
  console.log(`[saveApiKey] Stored in sessionStorage`);

  // Verify it was saved
  const verify = sessionStorage.getItem(`apikey_${provider}`);
  console.log(
    `[saveApiKey] Verification:`,
    verify ? "FOUND in sessionStorage" : "NOT FOUND"
  );
}

/**
 * Retrieve and decrypt an API key from sessionStorage.
 *
 * @param provider - Provider identifier (e.g., "anthropic", "openai")
 * @returns Decrypted API key or null if not found
 */
export async function getApiKey(provider: string): Promise<string | null> {
  console.log(`[getApiKey] Getting key for provider: ${provider}`);

  const encrypted = sessionStorage.getItem(`apikey_${provider}`);
  console.log(`[getApiKey] Encrypted key found:`, encrypted ? "YES" : "NO");

  if (!encrypted) {
    console.log(
      `[getApiKey] No encrypted key in sessionStorage for ${provider}`
    );
    console.log(
      `[getApiKey] Available keys:`,
      Object.keys(sessionStorage).filter((k) => k.startsWith("apikey_"))
    );
    return null;
  }

  const chatApiKey = await getChatApiKey();
  console.log(`[getApiKey] Chat API key found:`, chatApiKey ? "YES" : "NO");

  if (!chatApiKey) {
    console.log(`[getApiKey] No user credentials in sessionStorage`);
    return null;
  }

  try {
    const decrypted = await decrypt(chatApiKey, encrypted);
    console.log(
      `[getApiKey] Decryption successful:`,
      decrypted ? "YES (length: " + decrypted.length + ")" : "NO"
    );
    return decrypted;
  } catch (error) {
    console.error("[getApiKey] Failed to decrypt API key:", error);
    return null;
  }
}

/**
 * Remove an API key from sessionStorage.
 *
 * @param provider - Provider identifier (e.g., "anthropic", "openai")
 */
export function removeApiKey(provider: string): void {
  sessionStorage.removeItem(`apikey_${provider}`);
}

/**
 * Get all provider identifiers that have stored API keys.
 *
 * @returns Array of provider identifiers
 */
export function listStoredApiKeys(): string[] {
  const keys = Object.keys(sessionStorage);
  return keys
    .filter((key) => key.startsWith("apikey_"))
    .map((key) => key.replace("apikey_", ""));
}

/**
 * Clear all API keys and user credentials from sessionStorage.
 * Called on logout or when user explicitly clears keys.
 */
export function clearAllApiKeys(): void {
  const keys = Object.keys(sessionStorage);
  keys.forEach((key) => {
    if (
      key.startsWith("apikey_") ||
      key === "user_password" ||
      key === "user_salt"
    ) {
      sessionStorage.removeItem(key);
    }
  });
}
