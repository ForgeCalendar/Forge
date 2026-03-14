import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

export type ProviderModel = {
  id: string;
  providerId: string;
  modelId: string;
  name: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ProviderWithModels = {
  id: string;
  userId: string;
  type: string;
  name: string;
  baseUrl: string | null;
  apiKey: string;
  createdAt: string;
  updatedAt: string;
  models: ProviderModel[];
};

export const providerKeys = {
  all: ["providers"] as const,
  detail: (id: string) => ["providers", id] as const,
};

async function fetchProviders(): Promise<ProviderWithModels[]> {
  const response = await fetch("/api/providers");
  if (!response.ok) throw new Error("Failed to fetch providers");
  return response.json();
}

export function useProvidersQuery() {
  return useQuery({
    queryKey: providerKeys.all,
    queryFn: fetchProviders,
  });
}

export function useDefaultProviderModel(): {
  providerId: string;
  modelId: string;
} | null {
  const { data: providers } = useProvidersQuery();

  return useMemo(() => {
    if (!providers || providers.length === 0) return null;

    for (const provider of providers) {
      const defaultModel = provider.models.find(
        (m: ProviderModel) => m.isDefault
      );
      if (defaultModel) {
        return { providerId: provider.id, modelId: defaultModel.modelId };
      }
    }

    const first = providers[0];
    if (first.models.length > 0) {
      return { providerId: first.id, modelId: first.models[0].modelId };
    }

    return null;
  }, [providers]);
}
