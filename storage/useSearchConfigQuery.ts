import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// Types
export interface SearchConfig {
  hasTavilyApiKey: boolean;
}

export interface UpdateSearchConfigInput {
  tavilyApiKey: string;
}

// Query keys
export const searchConfigKeys = {
  config: ["searchConfig"] as const,
};

// API functions
async function fetchSearchConfig(): Promise<SearchConfig> {
  const response = await fetch("/api/search-config");
  if (!response.ok) throw new Error("Failed to fetch search config");
  return response.json();
}

async function updateSearchConfig(
  input: UpdateSearchConfigInput
): Promise<SearchConfig> {
  const response = await fetch("/api/search-config", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || "Failed to update search config");
  }
  return response.json();
}

// Hooks
export function useSearchConfigQuery() {
  return useQuery({
    queryKey: searchConfigKeys.config,
    queryFn: fetchSearchConfig,
  });
}

export function useUpdateSearchConfigMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateSearchConfig,
    onSuccess: (data) => {
      queryClient.setQueryData(searchConfigKeys.config, data);
    },
  });
}
