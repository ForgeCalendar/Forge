/**
 * Client-side hooks for managing providers with server-side encrypted storage.
 * Provider data (type, name, baseUrl, apiKey) is encrypted before sending to server.
 */

import { useState, useEffect, useCallback } from "react";
import { encrypt, decrypt } from "@/lib/crypto/client";
import { getChatApiKey } from "@/lib/crypto/storage";

export type ProviderType =
  | "anthropic"
  | "openai"
  | "google"
  | "mistral"
  | "openai-compatible";

export interface ProviderData {
  type: ProviderType;
  name: string;
  baseUrl?: string;
  apiKey: string;
}

export interface Provider extends ProviderData {
  id: string;
}

/**
 * Fetch all providers from server and decrypt
 */
async function fetchProviders(): Promise<Provider[]> {
  try {
    const response = await fetch("/api/providers");
    if (!response.ok) {
      throw new Error("Failed to fetch providers");
    }

    const serverProviders = await response.json();
    const chatApiKey = await getChatApiKey();
    if (!chatApiKey) {
      console.warn("[fetchProviders] No chatapi key available");
      return [];
    }

    const providers: Provider[] = [];
    for (const sp of serverProviders) {
      try {
        const decryptedData = await decrypt(chatApiKey, sp.encryptedData);
        const data: ProviderData = JSON.parse(decryptedData);
        providers.push({
          id: sp.id,
          ...data,
        });
      } catch (error) {
        console.error(
          `[fetchProviders] Failed to decrypt provider ${sp.id}:`,
          error
        );
      }
    }

    return providers;
  } catch (error) {
    console.error("[fetchProviders] Error:", error);
    return [];
  }
}

/**
 * React hook to manage providers
 */
export function useProviders() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);

  // Load providers on mount
  const loadProviders = useCallback(async () => {
    setLoading(true);
    const providers = await fetchProviders();
    setProviders(providers);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadProviders();
  }, [loadProviders]);

  // Create a new provider
  const createProvider = useCallback(
    async (
      data: ProviderData
    ): Promise<{ success: boolean; id?: string; error?: string }> => {
      try {
        const chatApiKey = await getChatApiKey();
        if (!chatApiKey) {
          return { success: false, error: "Not logged in" };
        }

        // Encrypt the provider data
        const encryptedData = await encrypt(chatApiKey, JSON.stringify(data));

        // Send to server
        const response = await fetch("/api/providers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ encryptedData }),
        });

        if (!response.ok) {
          const error = await response.json();
          return {
            success: false,
            error: error.error || "Failed to create provider",
          };
        }

        const result = await response.json();

        // Reload providers
        await loadProviders();

        return { success: true, id: result.id };
      } catch (error: any) {
        console.error("[createProvider] Error:", error);
        return { success: false, error: error.message };
      }
    },
    [loadProviders]
  );

  // Update an existing provider
  const updateProvider = useCallback(
    async (
      id: string,
      data: ProviderData
    ): Promise<{ success: boolean; error?: string }> => {
      try {
        const chatApiKey = await getChatApiKey();
        if (!chatApiKey) {
          return { success: false, error: "Not logged in" };
        }

        // Encrypt the provider data
        const encryptedData = await encrypt(chatApiKey, JSON.stringify(data));

        // Send to server
        const response = await fetch(`/api/providers/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ encryptedData }),
        });

        if (!response.ok) {
          const error = await response.json();
          return {
            success: false,
            error: error.error || "Failed to update provider",
          };
        }

        // Reload providers
        await loadProviders();

        return { success: true };
      } catch (error: any) {
        console.error("[updateProvider] Error:", error);
        return { success: false, error: error.message };
      }
    },
    [loadProviders]
  );

  // Delete a provider
  const deleteProvider = useCallback(
    async (id: string): Promise<{ success: boolean; error?: string }> => {
      try {
        const response = await fetch(`/api/providers/${id}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          const error = await response.json();
          return {
            success: false,
            error: error.error || "Failed to delete provider",
          };
        }

        // Reload providers
        await loadProviders();

        return { success: true };
      } catch (error: any) {
        console.error("[deleteProvider] Error:", error);
        return { success: false, error: error.message };
      }
    },
    [loadProviders]
  );

  // Get a single provider by ID
  const getProvider = useCallback(
    (id: string): Provider | undefined => {
      return providers.find((p) => p.id === id);
    },
    [providers]
  );

  return {
    providers,
    loading,
    createProvider,
    updateProvider,
    deleteProvider,
    getProvider,
    refresh: loadProviders,
  };
}
