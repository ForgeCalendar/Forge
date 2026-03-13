import { POST } from "@/app/api/ics-subscriptions/[id]/sync/route";
import { prismaMock } from "@/__tests__/utils/prisma-mock";
import {
  createMockRequest,
  mockIcsSubscription,
} from "@/__tests__/utils/test-helpers";
import * as auth from "@/lib/auth";

jest.mock("@/lib/auth", () => ({
  requireAuth: jest.fn(),
}));

jest.mock("node-ical", () => ({
  async: {
    fromURL: jest.fn(),
  },
}));

import * as ical from "node-ical";
const mockFromURL = ical.async.fromURL as jest.Mock;

const makeDateWithTz = (iso: string, tz?: string): ical.DateWithTimeZone => {
  const d = new Date(iso) as ical.DateWithTimeZone;
  if (tz) d.tz = tz;
  return d;
};

const mockVEvent: ical.VEvent = {
  type: "VEVENT",
  uid: "event-uid-123@google.com",
  dtstamp: makeDateWithTz("2024-06-01T00:00:00Z"),
  summary: "Team Standup",
  description: "Daily standup meeting",
  location: "Conference Room A",
  start: makeDateWithTz("2024-06-01T10:00:00Z", "America/New_York"),
  end: makeDateWithTz("2024-06-01T10:30:00Z", "America/New_York"),
  datetype: "date-time",
  status: "CONFIRMED",
  organizer: "mailto:organizer@example.com",
  transparency: "OPAQUE",
  categories: ["work", "standup"],
  url: "https://meet.google.com/abc",
};

describe("POST /api/ics-subscriptions/:id/sync", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should sync events from an ICS subscription", async () => {
    (auth.requireAuth as jest.Mock).mockResolvedValue("test@example.com");

    prismaMock.icsSubscription.findFirst.mockResolvedValue(
      mockIcsSubscription as any
    );

    mockFromURL.mockResolvedValue({
      "event-uid-123@google.com": mockVEvent,
    });

    prismaMock.event.upsert.mockResolvedValue({} as any);
    prismaMock.icsSubscription.update.mockResolvedValue({} as any);

    const request = createMockRequest({ method: "POST" });
    const params = Promise.resolve({ id: "ics-sub-1" });

    const response = await POST(request, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.syncedCount).toBe(1);
    expect(data.message).toBe("Synced 1 events");

    expect(mockFromURL).toHaveBeenCalledWith(mockIcsSubscription.url);

    expect(prismaMock.event.upsert).toHaveBeenCalledWith({
      where: {
        subscriptionId_uid: {
          subscriptionId: "ics-sub-1",
          uid: "event-uid-123@google.com",
        },
      },
      create: expect.objectContaining({
        userId: "test@example.com",
        subscriptionId: "ics-sub-1",
        uid: "event-uid-123@google.com",
        title: "Team Standup",
        description: "Daily standup meeting",
        location: "Conference Room A",
        start: "2024-06-01T10:00:00.000Z",
        end: "2024-06-01T10:30:00.000Z",
        startTimezone: "America/New_York",
        endTimezone: "America/New_York",
        isAllDay: false,
        status: "CONFIRMED",
        transparency: "OPAQUE",
        kind: "ics",
      }),
      update: expect.objectContaining({
        title: "Team Standup",
        start: "2024-06-01T10:00:00.000Z",
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
      mockIcsSubscription as any
    );

    const allDayEvent: ical.VEvent = {
      ...mockVEvent,
      uid: "all-day-uid@google.com",
      summary: "Holiday",
      datetype: "date",
      start: makeDateWithTz("2024-07-04T00:00:00Z"),
      end: makeDateWithTz("2024-07-05T00:00:00Z"),
    };

    mockFromURL.mockResolvedValue({
      "all-day-uid@google.com": allDayEvent,
    });

    prismaMock.event.upsert.mockResolvedValue({} as any);
    prismaMock.icsSubscription.update.mockResolvedValue({} as any);

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

  it("should handle ParameterValue objects for summary/description/location", async () => {
    (auth.requireAuth as jest.Mock).mockResolvedValue("test@example.com");

    prismaMock.icsSubscription.findFirst.mockResolvedValue(
      mockIcsSubscription as any
    );

    const eventWithParams: ical.VEvent = {
      ...mockVEvent,
      uid: "param-uid@google.com",
      summary: { val: "Besprechung", params: { LANGUAGE: "de" } },
      description: { val: "Tägliches Meeting", params: {} },
      location: { val: "Raum A", params: { LANGUAGE: "de" } },
    };

    mockFromURL.mockResolvedValue({
      "param-uid@google.com": eventWithParams,
    });

    prismaMock.event.upsert.mockResolvedValue({} as any);
    prismaMock.icsSubscription.update.mockResolvedValue({} as any);

    const request = createMockRequest({ method: "POST" });
    const params = Promise.resolve({ id: "ics-sub-1" });

    const response = await POST(request, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(prismaMock.event.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          title: "Besprechung",
          description: "Tägliches Meeting",
          location: "Raum A",
        }),
      })
    );
  });

  it("should skip non-VEVENT components", async () => {
    (auth.requireAuth as jest.Mock).mockResolvedValue("test@example.com");

    prismaMock.icsSubscription.findFirst.mockResolvedValue(
      mockIcsSubscription as any
    );

    mockFromURL.mockResolvedValue({
      vcalendar: { type: "VCALENDAR", version: "2.0" },
      timezone: { type: "VTIMEZONE", tzid: "America/New_York" },
      "event-uid-123@google.com": mockVEvent,
    });

    prismaMock.event.upsert.mockResolvedValue({} as any);
    prismaMock.icsSubscription.update.mockResolvedValue({} as any);

    const request = createMockRequest({ method: "POST" });
    const params = Promise.resolve({ id: "ics-sub-1" });

    const response = await POST(request, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
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
      mockIcsSubscription as any
    );

    mockFromURL.mockRejectedValue(new Error("Network error"));

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
      mockIcsSubscription as any
    );

    mockFromURL.mockResolvedValue({
      "event-uid-123@google.com": mockVEvent,
    });

    prismaMock.event.upsert.mockRejectedValue(new Error("Database error"));

    const request = createMockRequest({ method: "POST" });
    const params = Promise.resolve({ id: "ics-sub-1" });

    const response = await POST(request, { params });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to sync ICS subscription");
  });
});
