import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createMistral } from "@ai-sdk/mistral";
import type { Provider } from "@/lib/generated/prisma";

export const PROVIDER_TYPES = [
  "anthropic",
  "openai",
  "google",
  "mistral",
  "openai-compatible",
] as const;

export type ProviderType = (typeof PROVIDER_TYPES)[number];

export function isValidProviderType(type: string): type is ProviderType {
  return (PROVIDER_TYPES as readonly string[]).includes(type);
}

/** Suggestion list per provider type — NOT an exhaustive restriction. */
export const KNOWN_MODELS: Record<
  ProviderType,
  { modelId: string; name: string }[]
> = {
  anthropic: [
    { modelId: "claude-sonnet-4-5-20250929", name: "Claude Sonnet 4.5" },
    { modelId: "claude-haiku-4-20250414", name: "Claude Haiku 4" },
    { modelId: "claude-opus-4-20250514", name: "Claude Opus 4" },
  ],
  openai: [
    { modelId: "gpt-4o", name: "GPT-4o" },
    { modelId: "gpt-4o-mini", name: "GPT-4o Mini" },
    { modelId: "o3-mini", name: "o3-mini" },
  ],
  google: [
    { modelId: "gemini-2.5-flash", name: "Gemini 2.5 Flash" },
    { modelId: "gemini-2.5-pro", name: "Gemini 2.5 Pro" },
  ],
  mistral: [
    { modelId: "mistral-large-latest", name: "Mistral Large" },
    { modelId: "mistral-medium-latest", name: "Mistral Medium" },
  ],
  "openai-compatible": [],
};

export function createLanguageModel(
  provider: Pick<Provider, "type" | "apiKey" | "baseUrl">,
  modelId: string,
) {
  const opts = {
    apiKey: provider.apiKey,
    ...(provider.baseUrl ? { baseURL: provider.baseUrl } : {}),
  };

  switch (provider.type) {
    case "anthropic":
      return createAnthropic(opts)(modelId);

    case "openai":
    case "openai-compatible":
      return createOpenAI(opts)(modelId);

    case "google":
      return createGoogleGenerativeAI(opts)(modelId);

    case "mistral":
      return createMistral(opts)(modelId);

    default:
      throw new Error(`Unsupported provider type: ${provider.type}`);
  }
}
