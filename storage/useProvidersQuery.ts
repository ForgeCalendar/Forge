import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  // NOTE: apiKey removed - now stored client-side only (encrypted in browser)
  createdAt: string;
  updatedAt: string;
  models: ProviderModel[];
};

export type CreateProviderInput = {
  type: string;
  name: string;
  // NOTE: apiKey removed - now stored client-side only via ApiKeyManager
  baseUrl?: string;
};

export type UpdateProviderInput = {
  name?: string;
  // NOTE: apiKey removed - now stored client-side only via ApiKeyManager
  baseUrl?: string;
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

async function createProvider(
  input: CreateProviderInput
): Promise<ProviderWithModels> {
  const response = await fetch("/api/providers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || "Failed to create provider");
  }
  return response.json();
}

async function updateProvider(
  id: string,
  input: UpdateProviderInput
): Promise<ProviderWithModels> {
  const response = await fetch(`/api/providers/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || "Failed to update provider");
  }
  return response.json();
}

async function deleteProvider(id: string): Promise<void> {
  const response = await fetch(`/api/providers/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("Failed to delete provider");
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

export function useCreateProviderMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createProvider,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: providerKeys.all });
    },
  });
}

export function useUpdateProviderMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateProviderInput }) =>
      updateProvider(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: providerKeys.all });
    },
  });
}

export function useDeleteProviderMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteProvider,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: providerKeys.all });
    },
  });
}
