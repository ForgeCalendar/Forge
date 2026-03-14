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
import {
  useInfoTagsQuery,
  useCreateInfoTagMutation,
  useUpdateInfoTagMutation,
  useDeleteInfoTagMutation,
} from "./useInfoTagsQuery";
import type {
  GoalWithId,
  EventWithId,
  InfoTagWithId,
  CreateGoalInput,
  UpdateGoalInput,
  CreateCalendarEventInput,
  UpdateCalendarEventInput,
  CreateInfoTagInput,
  UpdateInfoTagInput,
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

// Info Tags Hook
export function useInfoTags() {
  const query = useInfoTagsQuery();
  const createMutation = useCreateInfoTagMutation();
  const updateMutation = useUpdateInfoTagMutation();
  const deleteMutation = useDeleteInfoTagMutation();

  const create = useCallback(
    (input: CreateInfoTagInput): Promise<InfoTagWithId> =>
      createMutation.mutateAsync(input),
    [createMutation]
  );

  const update = useCallback(
    (id: string, input: UpdateInfoTagInput): Promise<InfoTagWithId | null> =>
      updateMutation.mutateAsync({ id, input }),
    [updateMutation]
  );

  const deleteInfoTag = useCallback(
    (id: string): Promise<boolean> =>
      deleteMutation.mutateAsync(id).then(() => true),
    [deleteMutation]
  );

  return {
    infoTags: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    create,
    update,
    delete: deleteInfoTag,
  };
}
