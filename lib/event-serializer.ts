import type { Event } from "@/lib/generated/prisma";

/**
 * Serialize a Prisma Event into FullCalendar list format.
 * Used by GET /api/events to render the calendar grid.
 */
export function toCalendarEvent(event: Event): Record<string, unknown> {
  const parsedMeta = event.metadata ? JSON.parse(event.metadata) : {};
  const isGoalEvent = !!event.goalId;
  const isIcsEvent = !!event.subscriptionId;

  return {
    id: event.id,
    title: event.title,
    start: new Date(event.start),
    end: new Date(event.end),
    allDay: event.isAllDay,
    ...(isGoalEvent
      ? { backgroundColor: "#4F46E5", borderColor: "#4338CA" }
      : isIcsEvent
        ? { backgroundColor: "#059669", borderColor: "#047857" }
        : {}),
    extendedProps: {
      kind: event.kind || (isIcsEvent ? "ics" : undefined),
      goalId: event.goalId,
      completed: event.completed,
      minutesEstimate: event.minutesEstimate,
      subscriptionId: event.subscriptionId,
      location: event.location,
      status: event.status,
      description: event.description,
      isReadOnly: isIcsEvent,
      ...parsedMeta,
    },
  };
}

/**
 * Serialize a Prisma Event into the single-item API response format.
 * Used by GET/PATCH/POST on /api/events/[id] and POST /api/events.
 */
export function toEventResponse(event: Event): Record<string, unknown> {
  return {
    id: event.id,
    title: event.title,
    start: new Date(event.start),
    end: new Date(event.end),
    extendedProps: {
      kind: event.kind,
      goalId: event.goalId,
      completed: event.completed,
      minutesEstimate: event.minutesEstimate,
      ...(event.metadata ? JSON.parse(event.metadata) : {}),
    },
  };
}
