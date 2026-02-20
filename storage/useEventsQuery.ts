import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  EventWithId,
  CreateCalendarEventInput,
  UpdateCalendarEventInput,
} from "./types";

// Query keys
export const eventKeys = {
  all: ["events"] as const,
  detail: (id: string) => ["events", id] as const,
};

// API functions
async function fetchEvents(): Promise<EventWithId[]> {
  const response = await fetch("/api/events");
  if (!response.ok) throw new Error("Failed to fetch events");
  const data = await response.json();
  // Parse ISO date strings to Date objects
  return data.map(
    (event: { start: string; end: string; [key: string]: unknown }) => ({
      ...event,
      start: new Date(event.start),
      end: new Date(event.end),
    }),
  );
}

async function fetchEvent(id: string): Promise<EventWithId> {
  const response = await fetch(`/api/events/${id}`);
  if (!response.ok) throw new Error("Failed to fetch event");
  const data = await response.json();
  return {
    ...data,
    start: new Date(data.start),
    end: new Date(data.end),
  };
}

async function createEvent(
  input: CreateCalendarEventInput,
): Promise<EventWithId> {
  const { extendedProps, ...rest } = input;
  const response = await fetch("/api/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: rest.title,
      start: rest.start.toISOString(),
      end: rest.end.toISOString(),
      kind: extendedProps?.kind || "task",
      goalId: extendedProps?.goalId || null,
      completed: extendedProps?.completed ?? false,
      minutesEstimate: extendedProps?.minutesEstimate ?? null,
    }),
  });
  if (!response.ok) throw new Error("Failed to create event");
  const data = await response.json();
  return {
    ...data,
    start: new Date(data.start),
    end: new Date(data.end),
  };
}

async function updateEvent(
  id: string,
  input: UpdateCalendarEventInput,
): Promise<EventWithId> {
  const response = await fetch(`/api/events/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...input,
      start: input.start ? input.start.toISOString() : undefined,
      end: input.end ? input.end.toISOString() : undefined,
    }),
  });
  if (!response.ok) throw new Error("Failed to update event");
  const data = await response.json();
  return {
    ...data,
    start: new Date(data.start),
    end: new Date(data.end),
  };
}

async function deleteEvent(id: string): Promise<void> {
  const response = await fetch(`/api/events/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("Failed to delete event");
}

// Hooks
export function useEventsQuery() {
  return useQuery({
    queryKey: eventKeys.all,
    queryFn: fetchEvents,
  });
}

export function useEventQuery(id: string) {
  return useQuery({
    queryKey: eventKeys.detail(id),
    queryFn: () => fetchEvent(id),
    enabled: !!id,
  });
}

export function useCreateEventMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createEvent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eventKeys.all });
    },
  });
}

export function useUpdateEventMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: UpdateCalendarEventInput;
    }) => updateEvent(id, input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: eventKeys.all });
      queryClient.invalidateQueries({
        queryKey: eventKeys.detail(variables.id),
      });
    },
  });
}

export function useDeleteEventMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteEvent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eventKeys.all });
    },
  });
}
