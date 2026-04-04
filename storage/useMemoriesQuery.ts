import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// Types
export interface Memory {
  id: string;
  userId: string;
  question: string;
  answer: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMemoryInput {
  question: string;
  answer: string;
}

export interface UpdateMemoryInput {
  question?: string;
  answer?: string;
}

// Query keys
export const memoryKeys = {
  all: ["memories"] as const,
  detail: (id: string) => ["memories", id] as const,
};

// API functions
async function fetchMemories(): Promise<Memory[]> {
  const response = await fetch("/api/memories");
  if (!response.ok) throw new Error("Failed to fetch memories");
  return response.json();
}

async function createMemory(input: CreateMemoryInput): Promise<Memory> {
  const response = await fetch("/api/memories", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || "Failed to create memory");
  }
  return response.json();
}

async function updateMemory(
  id: string,
  input: UpdateMemoryInput
): Promise<Memory> {
  const response = await fetch(`/api/memories/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || "Failed to update memory");
  }
  return response.json();
}

async function deleteMemory(id: string): Promise<void> {
  const response = await fetch(`/api/memories/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("Failed to delete memory");
}

// Hooks
export function useMemoriesQuery() {
  return useQuery({
    queryKey: memoryKeys.all,
    queryFn: fetchMemories,
  });
}

export function useCreateMemoryMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createMemory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: memoryKeys.all });
    },
  });
}

export function useUpdateMemoryMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateMemoryInput }) =>
      updateMemory(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: memoryKeys.all });
    },
  });
}

export function useDeleteMemoryMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteMemory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: memoryKeys.all });
    },
  });
}
