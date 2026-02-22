import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { GoalWithId, CreateGoalInput, UpdateGoalInput } from "./types";
import { eventKeys } from "./useEventsQuery";

// Query keys
export const goalKeys = {
  all: ["goals"] as const,
  detail: (id: string) => ["goals", id] as const,
};

// API functions
async function fetchGoals(): Promise<GoalWithId[]> {
  const response = await fetch("/api/goals");
  if (!response.ok) throw new Error("Failed to fetch goals");
  return response.json();
}

async function fetchGoal(id: string): Promise<GoalWithId> {
  const response = await fetch(`/api/goals/${id}`);
  if (!response.ok) throw new Error("Failed to fetch goal");
  return response.json();
}

async function createGoal(input: CreateGoalInput): Promise<GoalWithId> {
  const response = await fetch("/api/goals", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error("Failed to create goal");
  return response.json();
}

async function updateGoal(
  id: string,
  input: UpdateGoalInput
): Promise<GoalWithId> {
  const response = await fetch(`/api/goals/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error("Failed to update goal");
  return response.json();
}

async function deleteGoal(id: string): Promise<void> {
  const response = await fetch(`/api/goals/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("Failed to delete goal");
}

// Hooks
export function useGoalsQuery() {
  return useQuery({
    queryKey: goalKeys.all,
    queryFn: fetchGoals,
  });
}

export function useGoalQuery(id: string) {
  return useQuery({
    queryKey: goalKeys.detail(id),
    queryFn: () => fetchGoal(id),
    enabled: !!id,
  });
}

export function useCreateGoalMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createGoal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: goalKeys.all });
      // Also invalidate events since creating a goal creates events
      queryClient.invalidateQueries({ queryKey: eventKeys.all });
    },
  });
}

export function useUpdateGoalMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateGoalInput }) =>
      updateGoal(id, input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: goalKeys.all });
      queryClient.invalidateQueries({
        queryKey: goalKeys.detail(variables.id),
      });
    },
  });
}

export function useDeleteGoalMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteGoal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: goalKeys.all });
      // Also invalidate events since deleting a goal cascades to events
      queryClient.invalidateQueries({ queryKey: eventKeys.all });
    },
  });
}
