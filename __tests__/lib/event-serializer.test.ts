import { toCalendarEvent, toEventResponse } from "@/lib/event-serializer";
import type { Event } from "@/lib/generated/prisma";

const baseEvent: Event = {
  id: "event-1",
  userId: "test@example.com",
  goalId: null,
  subscriptionId: null,
  uid: null,
  recurid: "",
  title: "Test Event",
  description: null,
  location: null,
  start: new Date("2024-06-01T10:00:00.000Z"),
  end: new Date("2024-06-01T11:00:00.000Z"),
  startTimezone: null,
  endTimezone: null,
  isAllDay: false,
  status: null,
  organizer: null,
  recurrenceRule: null,
  exdates: null,
  transparency: null,
  categories: null,
  url: null,
  rawData: null,
  kind: "meeting",
  completed: false,
  confirmed: true,
  minutesEstimate: null,
  order: 0,
  metadata: null,
  chatHistoryId: null,
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
};

describe("toCalendarEvent", () => {
  it("should convert a basic event to calendar format", () => {
    const result = toCalendarEvent(baseEvent);

    expect(result).toEqual({
      id: "event-1",
      title: "Test Event",
      start: baseEvent.start,
      end: baseEvent.end,
      allDay: false,
      extendedProps: {
        location: null,
        status: null,
        description: null,
        kind: "meeting",
        goalId: null,
        completed: false,
        confirmed: true,
        minutesEstimate: null,
        subscriptionId: null,
        isReadOnly: false,
      },
    });
  });

  it("should add colors for goal events", () => {
    const goalEvent: Event = {
      ...baseEvent,
      goalId: "goal-1",
    };

    const result = toCalendarEvent(goalEvent);

    expect(result.backgroundColor).toBe("#4F46E5");
    expect(result.borderColor).toBe("#4338CA");
  });

  it("should add colors for ICS events", () => {
    const icsEvent: Event = {
      ...baseEvent,
      subscriptionId: "ics-sub-1",
      kind: "ics",
    };

    const result = toCalendarEvent(icsEvent);

    expect(result.backgroundColor).toBe("#059669");
    expect(result.borderColor).toBe("#047857");
    expect((result.extendedProps as any).isReadOnly).toBe(true);
  });

  it("should parse metadata JSON", () => {
    const eventWithMetadata: Event = {
      ...baseEvent,
      metadata: '{"priority":"high","notes":"important"}',
    };

    const result = toCalendarEvent(eventWithMetadata);

    expect((result.extendedProps as any).priority).toBe("high");
    expect((result.extendedProps as any).notes).toBe("important");
  });

  it("should handle invalid metadata JSON", () => {
    const eventWithBadMetadata: Event = {
      ...baseEvent,
      metadata: "invalid json",
    };

    const result = toCalendarEvent(eventWithBadMetadata);

    expect(result.extendedProps).toBeDefined();
    expect((result.extendedProps as any).kind).toBe("meeting");
  });

  it("should handle array metadata (return empty object)", () => {
    const eventWithArrayMetadata: Event = {
      ...baseEvent,
      metadata: '["item1","item2"]',
    };

    const result = toCalendarEvent(eventWithArrayMetadata);

    expect(result.extendedProps).toBeDefined();
  });

  it("should convert recurring master event to rrule format", () => {
    const recurringEvent: Event = {
      ...baseEvent,
      recurrenceRule: "FREQ=WEEKLY;BYDAY=MO,WE,FR",
      recurid: "",
    };

    const result = toCalendarEvent(recurringEvent);

    expect(result.rrule).toContain("DTSTART:");
    expect(result.rrule).toContain("RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR");
    expect(result.duration).toBeDefined();
    expect(result.start).toBeUndefined();
    expect(result.end).toBeUndefined();
  });

  it("should include exdates for recurring events", () => {
    const recurringEvent: Event = {
      ...baseEvent,
      recurrenceRule: "FREQ=DAILY",
      recurid: "",
      exdates: '["2024-06-02T10:00:00.000Z","2024-06-05T10:00:00.000Z"]',
    };

    const result = toCalendarEvent(recurringEvent);

    expect(result.exdate).toEqual([
      "2024-06-02T10:00:00.000Z",
      "2024-06-05T10:00:00.000Z",
    ]);
  });

  it("should handle all-day recurring events", () => {
    const allDayRecurring: Event = {
      ...baseEvent,
      isAllDay: true,
      recurrenceRule: "FREQ=YEARLY",
      recurid: "",
      start: new Date("2024-07-04T00:00:00.000Z"),
      end: new Date("2024-07-05T00:00:00.000Z"),
    };

    const result = toCalendarEvent(allDayRecurring);

    expect(result.rrule).toContain("DTSTART;VALUE=DATE:");
    expect(result.allDay).toBe(true);
  });

  it("should calculate duration correctly", () => {
    const eventWithDuration: Event = {
      ...baseEvent,
      recurrenceRule: "FREQ=DAILY",
      recurid: "",
      start: new Date("2024-06-01T10:00:00.000Z"),
      end: new Date("2024-06-01T11:30:00.000Z"), // 1.5 hours
    };

    const result = toCalendarEvent(eventWithDuration);

    expect(result.duration).toBe("PT01H30M00S");
  });

  it("should handle zero duration", () => {
    const zeroDurationEvent: Event = {
      ...baseEvent,
      recurrenceRule: "FREQ=DAILY",
      recurid: "",
      start: new Date("2024-06-01T10:00:00.000Z"),
      end: new Date("2024-06-01T10:00:00.000Z"),
    };

    const result = toCalendarEvent(zeroDurationEvent);

    expect(result.duration).toBe("PT00H00M00S");
  });

  it("should not treat modified occurrences as recurring masters", () => {
    const modifiedOccurrence: Event = {
      ...baseEvent,
      recurrenceRule: "FREQ=DAILY",
      recurid: "2024-06-02T10:00:00.000Z",
    };

    const result = toCalendarEvent(modifiedOccurrence);

    expect(result.rrule).toBeUndefined();
    expect(result.start).toBeDefined();
    expect(result.end).toBeDefined();
  });
});

describe("toEventResponse", () => {
  it("should convert event to response format", () => {
    const result = toEventResponse(baseEvent);

    expect(result).toEqual({
      id: "event-1",
      title: "Test Event",
      start: baseEvent.start,
      end: baseEvent.end,
      chatHistoryId: null,
      extendedProps: {
        kind: "meeting",
        goalId: null,
        completed: false,
        minutesEstimate: null,
      },
    });
  });

  it("should include parsed metadata in extendedProps", () => {
    const eventWithMetadata: Event = {
      ...baseEvent,
      metadata: '{"customField":"value"}',
    };

    const result = toEventResponse(eventWithMetadata);

    expect((result.extendedProps as any).customField).toBe("value");
  });

  it("should handle null metadata", () => {
    const result = toEventResponse(baseEvent);

    expect(result.extendedProps).toBeDefined();
    expect((result.extendedProps as any).kind).toBe("meeting");
  });

  it("should include chatHistoryId when present", () => {
    const eventWithChatHistory: Event = {
      ...baseEvent,
      chatHistoryId: "chat-123",
    };

    const result = toEventResponse(eventWithChatHistory);

    expect(result.chatHistoryId).toBe("chat-123");
  });
});
