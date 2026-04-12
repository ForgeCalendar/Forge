/**
 * Client-side API key storage with encryption
 * Keys are stored in sessionStorage (cleared on browser close)
 * and encrypted using the user's chatapi key (derived from password)
 */

import { encrypt, decrypt } from "@/lib/crypto/client";

/**
 * Get the chatapi encryption key from sessionStorage.
 * This key is derived from the user's password during login/registration.
 *
 * @returns CryptoKey or null if not logged in
 */
export async function getChatApiKey(): Promise<CryptoKey | null> {
  const keyMaterial = sessionStorage.getItem("chatapi_key_material");
  console.log(
    `[getChatApiKey] chatapi_key_material exists:`,
    keyMaterial ? "YES (length: " + keyMaterial.length + ")" : "NO"
  );

  if (!keyMaterial) {
    console.log(
      `[getChatApiKey] No chatapi_key_material in sessionStorage - user not logged in or key not set`
    );
    return null;
  }

  try {
    // Convert base64 string back to CryptoKey
    const rawKey = Uint8Array.from(atob(keyMaterial), (c) => c.charCodeAt(0));
    console.log(
      `[getChatApiKey] Decoded key material, length: ${rawKey.length} bytes`
    );

    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      rawKey,
      "AES-GCM",
      true,
      ["encrypt", "decrypt"]
    );
    console.log(`[getChatApiKey] Successfully imported CryptoKey`);

    return cryptoKey;
  } catch (error) {
    console.error("[getChatApiKey] Failed to import chatapi key:", error);
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
    console.error(
      `[saveApiKey] No chatapi_key_material found in sessionStorage`
    );
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
    console.log(`[getApiKey] No chatapi_key_material in sessionStorage`);
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
 * Clear all API keys from sessionStorage.
 * Called on logout or when user explicitly clears keys.
 */
export function clearAllApiKeys(): void {
  const keys = Object.keys(sessionStorage);
  keys.forEach((key) => {
    if (key.startsWith("apikey_") || key === "chatapi_key_material") {
      sessionStorage.removeItem(key);
    }
  });
}
