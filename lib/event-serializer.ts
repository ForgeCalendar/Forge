import type { Event } from "@/lib/generated/prisma";

/** Safely parse a JSON metadata string, returning an empty object on failure. */
function parseMetadata(raw: string | null): Record<string, unknown> {
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      !Array.isArray(parsed)
    ) {
      return parsed as Record<string, unknown>;
    }
    return {};
  } catch {
    return {};
  }
}

/**
 * Serialize a Prisma Event into FullCalendar list format.
 * Used by GET /api/events to render the calendar grid.
 */
export function toCalendarEvent(event: Event): Record<string, unknown> {
  const parsedMeta = parseMetadata(event.metadata);
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
      location: event.location,
      status: event.status,
      description: event.description,
      ...parsedMeta,
      kind: event.kind || (isIcsEvent ? "ics" : undefined),
      goalId: event.goalId,
      completed: event.completed,
      minutesEstimate: event.minutesEstimate,
      subscriptionId: event.subscriptionId,
      isReadOnly: isIcsEvent,
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
      ...parseMetadata(event.metadata),
      kind: event.kind,
      goalId: event.goalId,
      completed: event.completed,
      minutesEstimate: event.minutesEstimate,
    },
  };
}
