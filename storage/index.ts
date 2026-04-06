// Main hooks - TanStack Query powered
export { useGoals, useCalendarEvents } from "./hooks";

// Types
export type {
  Goal,
  Event,
  GoalWithId,
  EventWithId,
  CreateGoalInput,
  UpdateGoalInput,
  CreateCalendarEventInput,
  UpdateCalendarEventInput,
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
  useProvidersQuery,
  useDefaultProviderModel,
  useCreateProviderMutation,
  useUpdateProviderMutation,
  useDeleteProviderMutation,
} from "./useProvidersQuery";

export type {
  ProviderWithModels,
  ProviderModel,
  CreateProviderInput,
  UpdateProviderInput,
} from "./useProvidersQuery";

export { useUserQuery, useUpdateUserMutation } from "./useUserQuery";

export type { User, UpdateUserInput } from "./useUserQuery";

export {
  useChatHistoryQuery,
  useChatHistoriesQuery,
  useCreateChatHistory,
  useDeleteChatHistory,
} from "./useChatHistoryQuery";

export type {
  ChatHistoryResponse,
  ChatHistoryListItem,
  CreateChatHistoryInput,
} from "./useChatHistoryQuery";

export {
  useSearchConfigQuery,
  useUpdateSearchConfigMutation,
} from "./useSearchConfigQuery";

export type {
  SearchConfig,
  UpdateSearchConfigInput,
} from "./useSearchConfigQuery";

export {
  useMemoriesQuery,
  useCreateMemoryMutation,
  useUpdateMemoryMutation,
  useDeleteMemoryMutation,
} from "./useMemoriesQuery";

export type {
  Memory,
  CreateMemoryInput,
  UpdateMemoryInput,
} from "./useMemoriesQuery";

export {
  useIcsSubscriptionsQuery,
  useCreateIcsSubscriptionMutation,
  useUpdateIcsSubscriptionMutation,
  useDeleteIcsSubscriptionMutation,
  useSyncIcsSubscriptionMutation,
} from "./useIcsSubscriptionsQuery";

export type {
  IcsSubscription,
  CreateIcsSubscriptionInput,
  UpdateIcsSubscriptionInput,
} from "./useIcsSubscriptionsQuery";
