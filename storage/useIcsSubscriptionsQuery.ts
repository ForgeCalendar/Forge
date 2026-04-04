import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// Types
export interface IcsSubscription {
  id: string;
  userId: string;
  name: string;
  url: string;
  lastSynced: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateIcsSubscriptionInput {
  name: string;
  url: string;
}

export interface UpdateIcsSubscriptionInput {
  name?: string;
  url?: string;
}

// Query keys
export const icsSubscriptionKeys = {
  all: ["icsSubscriptions"] as const,
  detail: (id: string) => ["icsSubscriptions", id] as const,
};

// API functions
async function fetchIcsSubscriptions(): Promise<IcsSubscription[]> {
  const response = await fetch("/api/ics-subscriptions");
  if (!response.ok) throw new Error("Failed to fetch ICS subscriptions");
  return response.json();
}

async function createIcsSubscription(
  input: CreateIcsSubscriptionInput
): Promise<IcsSubscription> {
  const response = await fetch("/api/ics-subscriptions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || "Failed to create ICS subscription");
  }
  return response.json();
}

async function updateIcsSubscription(
  id: string,
  input: UpdateIcsSubscriptionInput
): Promise<IcsSubscription> {
  const response = await fetch(`/api/ics-subscriptions/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || "Failed to update ICS subscription");
  }
  return response.json();
}

async function deleteIcsSubscription(id: string): Promise<void> {
  const response = await fetch(`/api/ics-subscriptions/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("Failed to delete ICS subscription");
}

async function syncIcsSubscription(id: string): Promise<void> {
  const response = await fetch(`/api/ics-subscriptions/${id}/sync`, {
    method: "POST",
  });
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || "Failed to sync ICS subscription");
  }
}

// Hooks
export function useIcsSubscriptionsQuery() {
  return useQuery({
    queryKey: icsSubscriptionKeys.all,
    queryFn: fetchIcsSubscriptions,
  });
}

export function useCreateIcsSubscriptionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createIcsSubscription,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: icsSubscriptionKeys.all });
    },
  });
}

export function useUpdateIcsSubscriptionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: UpdateIcsSubscriptionInput;
    }) => updateIcsSubscription(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: icsSubscriptionKeys.all });
    },
  });
}

export function useDeleteIcsSubscriptionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteIcsSubscription,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: icsSubscriptionKeys.all });
    },
  });
}

export function useSyncIcsSubscriptionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: syncIcsSubscription,
    onSuccess: () => {
      // Invalidate both subscriptions and events after sync
      queryClient.invalidateQueries({ queryKey: icsSubscriptionKeys.all });
      queryClient.invalidateQueries({ queryKey: ["events"] });
    },
  });
}
