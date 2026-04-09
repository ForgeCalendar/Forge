import { POST } from "@/app/api/ics-subscriptions/[id]/sync/route";
import { prismaMock } from "@/__tests__/utils/prisma-mock";
import {
  createMockRequest,
  mockIcsSubscription,
} from "@/__tests__/utils/test-helpers";
import * as auth from "@/lib/auth";
import type { ParsedIcsData, IcsEvent } from "@jalexw/calendar-ics-parser";

jest.mock("@/lib/auth", () => ({
  requireAuth: jest.fn(),
}));

// Track the mock so tests can control what parseIcsData resolves to.
const mockParseIcsData = jest.fn<Promise<ParsedIcsData>, [string]>();

jest.mock("@jalexw/calendar-ics-parser", () => {
  // Keep the real parseIcsDate so date conversion works as expected.
  const actual = jest.requireActual("@jalexw/calendar-ics-parser");
  return {
    ...actual,
    parseIcsData: (...args: [string]) => mockParseIcsData(...args),
  };
});

// Mock global.fetch so the route's fetch() returns controlled text.
const mockFetch = jest.fn<Promise<Partial<Response>>, [string]>();
(global as unknown as { fetch: typeof mockFetch }).fetch = mockFetch;

/** Helper to build a minimal ParsedIcsData with the given events. */
function makeParsedIcsData(events: IcsEvent[]): ParsedIcsData {
  return {
    calendars: [
      {
        version: "2.0" as const,
        prodid: "-//Test//Test//EN",
        events,
        todos: [],
        journals: [],
        freebusys: [],
        timezones: [],
        unparsedComponents: [],
      },
    ],
    metadata: {
      totalEvents: events.length,
      totalTodos: 0,
      totalJournals: 0,
      totalFreebusys: 0,
      totalTimezones: 0,
      parseErrors: [],
      parseWarnings: [],
    },
  };
}

/** Helper to set up fetch + parseIcsData mocks for a set of events. */
function mockIcsResponse(events: IcsEvent[]): void {
  mockFetch.mockResolvedValue({
    ok: true,
    status: 200,
    text: async () => "BEGIN:VCALENDAR\nMOCKED\nEND:VCALENDAR",
  } as Response);
  mockParseIcsData.mockResolvedValue(makeParsedIcsData(events));
}

/** Helper to set up fetch + parseIcsData to simulate a network error. */
function mockFetchFailure(error: Error): void {
  mockFetch.mockRejectedValue(error);
}

const mockVEvent: IcsEvent = {
  uid: "event-uid-123@google.com",
  dtstamp: "20240601T000000Z",
  summary: "Team Standup",
  description: "Daily standup meeting",
  location: "Conference Room A",
  dtstart: "20240601T100000Z",
  dtend: "20240601T103000Z",
  status: "CONFIRMED",
  url: "https://meet.google.com/abc",
  categories: ["work", "standup"],
};

describe("POST /api/ics-subscriptions/:id/sync", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should sync events from an ICS subscription", async () => {
    (auth.requireAuth as jest.Mock).mockResolvedValue("test@example.com");

    prismaMock.icsSubscription.findFirst.mockResolvedValue(
      mockIcsSubscription as never
    );

    mockIcsResponse([mockVEvent]);

    prismaMock.event.upsert.mockResolvedValue({} as never);
    prismaMock.icsSubscription.update.mockResolvedValue({} as never);

    const request = createMockRequest({ method: "POST" });
    const params = Promise.resolve({ id: "ics-sub-1" });

    const response = await POST(request, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.syncedCount).toBe(1);
    expect(data.message).toBe("Synced 1 events");

    expect(mockFetch).toHaveBeenCalledWith(
      mockIcsSubscription.url,
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );

    expect(prismaMock.event.upsert).toHaveBeenCalledWith({
      where: {
        subscriptionId_uid_recurid: {
          subscriptionId: "ics-sub-1",
          uid: "event-uid-123@google.com",
          recurid: "",
        },
      },
      create: expect.objectContaining({
        userId: "test@example.com",
        subscriptionId: "ics-sub-1",
        uid: "event-uid-123@google.com",
        recurid: "",
        title: "Team Standup",
        description: "Daily standup meeting",
        location: "Conference Room A",
        start: expect.any(Date),
        end: expect.any(Date),
        startTimezone: null,
        endTimezone: null,
        isAllDay: false,
        status: "CONFIRMED",
        kind: "ics",
        recurrenceRule: null,
        exdates: null,
        categories: '["work","standup"]',
        url: "https://meet.google.com/abc",
        rawData: expect.any(String),
      }),
      update: expect.objectContaining({
        title: "Team Standup",
        start: expect.any(Date),
      }),
    });

    expect(prismaMock.icsSubscription.update).toHaveBeenCalledWith({
      where: { id: "ics-sub-1" },
      data: { lastSynced: expect.any(Date) },
    });
  });

  it("should handle all-day events", async () => {
    (auth.requireAuth as jest.Mock).mockResolvedValue("test@example.com");

    prismaMock.icsSubscription.findFirst.mockResolvedValue(
      mockIcsSubscription as never
    );

    const allDayEvent: IcsEvent = {
      uid: "all-day-uid@google.com",
      dtstamp: "20240704T000000Z",
      summary: "Holiday",
      dtstart: "20240704",
      dtend: "20240705",
    };

    mockIcsResponse([allDayEvent]);

    prismaMock.event.upsert.mockResolvedValue({} as never);
    prismaMock.icsSubscription.update.mockResolvedValue({} as never);

    const request = createMockRequest({ method: "POST" });
    const params = Promise.resolve({ id: "ics-sub-1" });

    const response = await POST(request, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.syncedCount).toBe(1);

    expect(prismaMock.event.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          isAllDay: true,
        }),
      })
    );
  });

  it("should skip events without dtstart", async () => {
    (auth.requireAuth as jest.Mock).mockResolvedValue("test@example.com");

    prismaMock.icsSubscription.findFirst.mockResolvedValue(
      mockIcsSubscription as never
    );

    const eventNoDtstart: IcsEvent = {
      uid: "no-start@google.com",
      dtstamp: "20240601T000000Z",
      summary: "No Start",
      // dtstart is omitted
    };

    mockIcsResponse([eventNoDtstart, mockVEvent]);

    prismaMock.event.upsert.mockResolvedValue({} as never);
    prismaMock.icsSubscription.update.mockResolvedValue({} as never);

    const request = createMockRequest({ method: "POST" });
    const params = Promise.resolve({ id: "ics-sub-1" });

    const response = await POST(request, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    // Only the valid event should be synced
    expect(data.syncedCount).toBe(1);
    expect(prismaMock.event.upsert).toHaveBeenCalledTimes(1);
  });

  it("should return 404 when subscription is not found", async () => {
    (auth.requireAuth as jest.Mock).mockResolvedValue("test@example.com");

    prismaMock.icsSubscription.findFirst.mockResolvedValue(null);

    const request = createMockRequest({ method: "POST" });
    const params = Promise.resolve({ id: "non-existent-id" });

    const response = await POST(request, { params });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Subscription not found");
  });

  it("should return 502 when ICS URL fetch fails", async () => {
    (auth.requireAuth as jest.Mock).mockResolvedValue("test@example.com");

    prismaMock.icsSubscription.findFirst.mockResolvedValue(
      mockIcsSubscription as never
    );

    mockFetchFailure(new Error("Network error"));

    const request = createMockRequest({ method: "POST" });
    const params = Promise.resolve({ id: "ics-sub-1" });

    const response = await POST(request, { params });
    const data = await response.json();

    expect(response.status).toBe(502);
    expect(data.error).toBe("Failed to fetch ICS data from URL");
  });

  it("should return 401 when user is not authenticated", async () => {
    (auth.requireAuth as jest.Mock).mockRejectedValue(
      new Error("Unauthorized")
    );

    const request = createMockRequest({ method: "POST" });
    const params = Promise.resolve({ id: "ics-sub-1" });

    const response = await POST(request, { params });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Authentication required");
  });

  it("should return 500 when database error occurs during upsert", async () => {
    (auth.requireAuth as jest.Mock).mockResolvedValue("test@example.com");

    prismaMock.icsSubscription.findFirst.mockResolvedValue(
      mockIcsSubscription as never
    );

    mockIcsResponse([mockVEvent]);

    prismaMock.event.upsert.mockRejectedValue(new Error("Database error"));

    const request = createMockRequest({ method: "POST" });
    const params = Promise.resolve({ id: "ics-sub-1" });

    const response = await POST(request, { params });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to sync ICS subscription");
  });
});
