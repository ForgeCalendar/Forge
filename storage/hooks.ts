import { useCallback } from "react";
import {
  useGoalsQuery,
  useCreateGoalMutation,
  useUpdateGoalMutation,
  useDeleteGoalMutation,
} from "./useGoalsQuery";
import {
  useEventsQuery,
  useCreateEventMutation,
  useUpdateEventMutation,
  useDeleteEventMutation,
} from "./useEventsQuery";
import type {
  GoalWithId,
  EventWithId,
  CreateGoalInput,
  UpdateGoalInput,
  CreateCalendarEventInput,
  UpdateCalendarEventInput,
} from "./types";

// Goals Hook
export function useGoals() {
  const query = useGoalsQuery();
  const createMutation = useCreateGoalMutation();
  const updateMutation = useUpdateGoalMutation();
  const deleteMutation = useDeleteGoalMutation();

  const create = useCallback(
    (input: CreateGoalInput): Promise<GoalWithId> =>
      createMutation.mutateAsync(input),
    [createMutation]
  );

  const update = useCallback(
    (id: string, input: UpdateGoalInput): Promise<GoalWithId | null> =>
      updateMutation.mutateAsync({ id, input }),
    [updateMutation]
  );

  const deleteGoal = useCallback(
    (id: string): Promise<boolean> =>
      deleteMutation.mutateAsync(id).then(() => true),
    [deleteMutation]
  );

  return {
    goals: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    create,
    update,
    delete: deleteGoal,
  };
}

// Calendar Events Hook
export function useCalendarEvents() {
  const query = useEventsQuery();
  const createMutation = useCreateEventMutation();
  const updateMutation = useUpdateEventMutation();
  const deleteMutation = useDeleteEventMutation();

  const create = useCallback(
    (input: CreateCalendarEventInput): Promise<EventWithId> =>
      createMutation.mutateAsync(input),
    [createMutation]
  );

  const update = useCallback(
    (
      id: string,
      input: UpdateCalendarEventInput
    ): Promise<EventWithId | null> => updateMutation.mutateAsync({ id, input }),
    [updateMutation]
  );

  const deleteEvent = useCallback(
    (id: string): Promise<boolean> =>
      deleteMutation.mutateAsync(id).then(() => true),
    [deleteMutation]
  );

  return {
    events: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    create,
    update,
    delete: deleteEvent,
  };
}
