// Main hooks - TanStack Query powered
export { useGoals, useCalendarEvents, useInfoTags } from "./hooks";

// Types
export type {
  Goal,
  Event,
  InfoTag,
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

// Low-level TanStack Query hooks (exported for advanced use cases)
export {
  useGoalsQuery,
  useGoalQuery,
  useCreateGoalMutation,
  useUpdateGoalMutation,
  useDeleteGoalMutation,
} from "./useGoalsQuery";

export {
  useEventsQuery,
  useEventQuery,
  useCreateEventMutation,
  useUpdateEventMutation,
  useDeleteEventMutation,
} from "./useEventsQuery";

export {
  useInfoTagsQuery,
  useInfoTagQuery,
  useCreateInfoTagMutation,
  useUpdateInfoTagMutation,
  useDeleteInfoTagMutation,
} from "./useInfoTagsQuery";
