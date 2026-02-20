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
    async (input: CreateGoalInput): Promise<GoalWithId> => {
      return new Promise((resolve, reject) => {
        createMutation.mutate(input, {
          onSuccess: (data) => resolve(data),
          onError: (error) => reject(error),
        });
      });
    },
    [createMutation]
  );

  const update = useCallback(
    async (id: string, input: UpdateGoalInput): Promise<GoalWithId | null> => {
      return new Promise((resolve, reject) => {
        updateMutation.mutate(
          { id, input },
          {
            onSuccess: (data) => resolve(data),
            onError: (error) => reject(error),
          }
        );
      });
    },
    [updateMutation]
  );

  const deleteGoal = useCallback(
    async (id: string): Promise<boolean> => {
      return new Promise((resolve, reject) => {
        deleteMutation.mutate(id, {
          onSuccess: () => resolve(true),
          onError: (error) => reject(error),
        });
      });
    },
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
    async (input: CreateCalendarEventInput): Promise<EventWithId> => {
      return new Promise((resolve, reject) => {
        createMutation.mutate(input, {
          onSuccess: (data) => resolve(data),
          onError: (error) => reject(error),
        });
      });
    },
    [createMutation]
  );

  const update = useCallback(
    async (
      id: string,
      input: UpdateCalendarEventInput
    ): Promise<EventWithId | null> => {
      return new Promise((resolve, reject) => {
        updateMutation.mutate(
          { id, input },
          {
            onSuccess: (data) => resolve(data),
            onError: (error) => reject(error),
          }
        );
      });
    },
    [updateMutation]
  );

  const deleteEvent = useCallback(
    async (id: string): Promise<boolean> => {
      return new Promise((resolve, reject) => {
        deleteMutation.mutate(id, {
          onSuccess: () => resolve(true),
          onError: (error) => reject(error),
        });
      });
    },
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
    async (input: CreateInfoTagInput): Promise<InfoTagWithId> => {
      return new Promise((resolve, reject) => {
        createMutation.mutate(input, {
          onSuccess: (data) => resolve(data),
          onError: (error) => reject(error),
        });
      });
    },
    [createMutation]
  );

  const update = useCallback(
    async (
      id: string,
      input: UpdateInfoTagInput
    ): Promise<InfoTagWithId | null> => {
      return new Promise((resolve, reject) => {
        updateMutation.mutate(
          { id, input },
          {
            onSuccess: (data) => resolve(data),
            onError: (error) => reject(error),
          }
        );
      });
    },
    [updateMutation]
  );

  const deleteInfoTag = useCallback(
    async (id: string): Promise<boolean> => {
      return new Promise((resolve, reject) => {
        deleteMutation.mutate(id, {
          onSuccess: () => resolve(true),
          onError: (error) => reject(error),
        });
      });
    },
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
