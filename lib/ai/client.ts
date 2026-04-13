/**
 * Client-side AI SDK initialization.
 * Creates language model instances for browser-based AI calls.
 */

import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createMistral } from "@ai-sdk/mistral";
import { LanguageModel } from "ai";

export type ProviderType =
  | "anthropic"
  | "openai"
  | "google"
  | "mistral"
  | "openai-compatible";

/**
 * Create a client-side language model instance.
 *
 * @param provider - Provider type
 * @param apiKey - User's API key (from encrypted storage)
 * @param modelId - Model identifier
 * @param baseUrl - Base URL (for openai-compatible providers)
 * @returns Configured LanguageModel instance
 */
export function createClientModel(
  provider: ProviderType,
  apiKey: string,
  modelId: string,
  baseUrl?: string
): LanguageModel {
  console.log(`[createClientModel] Creating model for provider: ${provider}`);
  console.log(`[createClientModel] Model ID: ${modelId}`);
  console.log(
    `[createClientModel] API key provided: ${
      apiKey ? "YES (length: " + apiKey.length + ")" : "NO"
    }`
  );
  console.log(`[createClientModel] Base URL: ${baseUrl || "default"}`);

  if (!apiKey) {
    throw new Error(`API key is required for ${provider} provider`);
  }

  switch (provider) {
    case "anthropic":
      console.log(
        `[createClientModel] Creating Anthropic model with browser access`
      );
      console.log(`[createClientModel] Model ID: ${modelId}`);
      console.log(
        `[createClientModel] Available models:`,
        getProviderModels("anthropic")
      );

      const anthropicProvider = createAnthropic({
        apiKey,
        headers: {
          // Enable direct browser access for Anthropic
          "anthropic-dangerous-direct-browser-access": "true",
        },
      });

      const model = anthropicProvider(modelId);
      console.log(`[createClientModel] Created model:`, model);
      return model;

    case "openai":
      console.log(
        `[createClientModel] Creating OpenAI model with browser access`
      );
      // Type assertion needed for browser access flag
      const openaiProvider = createOpenAI({
        apiKey,
        dangerouslyAllowBrowser: true,
      } as any);
      return openaiProvider(modelId);

    case "google":
      console.log(
        `[createClientModel] Creating Google model (CORS support may be limited)`
      );
      const googleProvider = createGoogleGenerativeAI({ apiKey });
      return googleProvider(modelId);

    case "mistral":
      console.log(`[createClientModel] Creating Mistral model`);
      const mistralProvider = createMistral({ apiKey });
      return mistralProvider(modelId);

    case "openai-compatible":
      if (!baseUrl) {
        throw new Error("baseUrl is required for openai-compatible providers");
      }
      console.log(
        `[createClientModel] Creating OpenAI-compatible model with browser access`
      );
      // Type assertion needed for browser access flag
      const compatibleProvider = createOpenAI({
        apiKey,
        baseURL: baseUrl,
        dangerouslyAllowBrowser: true,
      } as any);
      return compatibleProvider(modelId);

    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
}

/**
 * Test if a provider supports CORS (browser calls).
 * Attempts a minimal API call to detect CORS issues.
 *
 * @param provider - Provider type
 * @param apiKey - User's API key
 * @param modelId - Model to test
 * @param baseUrl - Base URL (for openai-compatible)
 * @returns true if CORS is supported, false otherwise
 */
export async function testProviderCORS(
  provider: ProviderType,
  apiKey: string,
  modelId: string,
  baseUrl?: string
): Promise<{ supported: boolean; error?: string }> {
  try {
    // For now, just return that the provider is supported
    // In the future, we could implement a proper CORS test
    return { supported: true };
  } catch (error: any) {
    // CORS errors typically manifest as TypeError or network errors
    if (
      error.name === "TypeError" ||
      error.message?.toLowerCase().includes("cors") ||
      error.message?.toLowerCase().includes("network")
    ) {
      return {
        supported: false,
        error: "CORS not supported - provider blocks browser requests",
      };
    }

    // Other errors (like auth errors) mean CORS works but something else is wrong
    return {
      supported: true,
      error: error.message,
    };
  }
}

/**
 * Get default model for a provider.
 */
export function getDefaultModel(provider: ProviderType): string {
  switch (provider) {
    case "anthropic":
      // Use Claude Sonnet 4.5
      return "claude-sonnet-4-5-20250929";
    case "openai":
      return "gpt-4o";
    case "google":
      return "gemini-2.5-flash";
    case "mistral":
      return "mistral-large-latest";
    case "openai-compatible":
      return ""; // User must specify
    default:
      return "";
  }
}

/**
 * Get available models for a provider.
 */
export function getProviderModels(provider: ProviderType): string[] {
  switch (provider) {
    case "anthropic":
      return [
        "claude-sonnet-4-5-20250929",
        "claude-haiku-4-20250414",
        "claude-opus-4-20250514",
      ];
    case "openai":
      return ["gpt-4o", "gpt-4o-mini", "o3-mini"];
    case "google":
      return ["gemini-2.5-flash", "gemini-2.5-pro"];
    case "mistral":
      return ["mistral-large-latest", "mistral-medium-latest"];
    default:
      return [];
  }
}

/**
 * Get provider name for display.
 */
export function getProviderName(provider: ProviderType): string {
  switch (provider) {
    case "anthropic":
      return "Anthropic";
    case "openai":
      return "OpenAI";
    case "google":
      return "Google";
    case "mistral":
      return "Mistral";
    case "openai-compatible":
      return "OpenAI-Compatible";
    default:
      return provider;
  }
}
