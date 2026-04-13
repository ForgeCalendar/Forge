export const PROVIDER_TYPES = [
  "anthropic",
  "openai",
  "google",
  "mistral",
  "openai-compatible",
] as const;

export type ProviderType = typeof PROVIDER_TYPES[number];

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
