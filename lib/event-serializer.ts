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
 * Convert a duration in milliseconds to an ISO 8601 duration string
 * (e.g. 5400000 ms → "PT01H30M"). Used by the FullCalendar rrule plugin.
 */
function msToIsoDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `PT${String(hours).padStart(2, "0")}H${String(minutes).padStart(
    2,
    "0"
  )}M${String(seconds).padStart(2, "0")}S`;
}

/**
 * Format a Date as an ICS DTSTART line for use in rrule strings.
 * All dates stored in the DB are UTC, so we emit UTC format.
 */
function toIcsDtstart(date: Date, isAllDay: boolean): string {
  const y = date.getUTCFullYear();
  const mo = String(date.getUTCMonth() + 1).padStart(2, "0");
  const da = String(date.getUTCDate()).padStart(2, "0");
  if (isAllDay) {
    return `DTSTART;VALUE=DATE:${y}${mo}${da}`;
  }
  const h = String(date.getUTCHours()).padStart(2, "0");
  const mi = String(date.getUTCMinutes()).padStart(2, "0");
  const s = String(date.getUTCSeconds()).padStart(2, "0");
  return `DTSTART:${y}${mo}${da}T${h}${mi}${s}Z`;
}

/**
 * Serialize a Prisma Event into FullCalendar list format.
 * Used by GET /api/events to render the calendar grid.
 *
 * For recurring master events (recurrenceRule set, recurid is ""):
 *   returns rrule + duration format consumed by @fullcalendar/rrule plugin.
 * For modified occurrences and regular events:
 *   returns standard start/end format.
 */
export function toCalendarEvent(event: Event): Record<string, unknown> {
  const parsedMeta = parseMetadata(event.metadata);
  const isGoalEvent = !!event.goalId;
  const isIcsEvent = !!event.subscriptionId;
  const isRecurringMaster = !!event.recurrenceRule && event.recurid === "";

  const colorProps = isGoalEvent
    ? { backgroundColor: "#4F46E5", borderColor: "#4338CA" }
    : isIcsEvent
    ? { backgroundColor: "#059669", borderColor: "#047857" }
    : {};

  const extendedProps = {
    location: event.location,
    status: event.status,
    description: event.description,
    ...parsedMeta,
    kind: event.kind || (isIcsEvent ? "ics" : undefined),
    goalId: event.goalId,
    completed: event.completed,
    confirmed: event.confirmed,
    minutesEstimate: event.minutesEstimate,
    subscriptionId: event.subscriptionId,
    isReadOnly: isIcsEvent,
  };

  if (isRecurringMaster) {
    const startMs = event.start.getTime();
    const endMs = event.end.getTime();
    const durationMs = Math.max(endMs - startMs, 0);

    // Build the full rrule string with DTSTART embedded so FullCalendar
    // doesn't need a separate `start` property (which would conflict).
    const rruleString = `${toIcsDtstart(event.start, event.isAllDay)}\nRRULE:${
      event.recurrenceRule
    }`;

    const exdates: string[] = event.exdates
      ? (JSON.parse(event.exdates) as string[])
      : [];

    return {
      id: event.id,
      title: event.title,
      rrule: rruleString,
      duration: msToIsoDuration(durationMs),
      allDay: event.isAllDay,
      exdate: exdates,
      ...colorProps,
      extendedProps,
    };
  }

  return {
    id: event.id,
    title: event.title,
    start: event.start,
    end: event.end,
    allDay: event.isAllDay,
    ...colorProps,
    extendedProps,
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
    start: event.start,
    end: event.end,
    extendedProps: {
      ...parseMetadata(event.metadata),
      kind: event.kind,
      goalId: event.goalId,
      completed: event.completed,
      minutesEstimate: event.minutesEstimate,
    },
  };
}
