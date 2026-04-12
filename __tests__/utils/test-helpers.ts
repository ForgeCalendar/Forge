import { NextRequest } from "next/server";

export function createMockRequest(options: {
  method: string;
  body?: any;
  headers?: Record<string, string>;
  cookies?: Record<string, string>;
}): NextRequest {
  const { method, body, headers = {}, cookies = {} } = options;

  const url = "http://localhost:3000/api/test";
  const init: RequestInit = {
    method,
    headers: new Headers(headers),
  };

  if (body) {
    init.body = JSON.stringify(body);
    init.headers = new Headers({
      ...headers,
      "Content-Type": "application/json",
    });
  }

  const request = new NextRequest(url, init as any);

  // Mock cookies
  if (Object.keys(cookies).length > 0) {
    const cookieStore = {
      get: (name: string) => {
        return cookies[name] ? { name, value: cookies[name] } : undefined;
      },
      set: jest.fn(),
      delete: jest.fn(),
    };

    jest.spyOn(request as any, "cookies", "get").mockReturnValue(cookieStore);
  }

  return request;
}

export const mockUser = {
  id: "test@example.com",
  authkeyHash: "$2a$10$abcdefghijklmnopqrstuvwxyz123456",
  timezone: "America/New_York",
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
};

export const mockGoal = {
  id: "goal-1",
  userId: "test@example.com",
  title: "Test Goal",
  description: "Test Description",
  dueDate: new Date("2024-12-31"),
  chatHistoryId: null,
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
  events: [],
  infoTags: [],
};

export const mockEvent = {
  id: "event-1",
  userId: "test@example.com",
  goalId: null,
  title: "Test Event",
  start: new Date("2024-06-01T10:00:00.000Z"),
  end: new Date("2024-06-01T11:00:00.000Z"),
  kind: "meeting",
  completed: false,
  confirmed: true,
  minutesEstimate: null,
  order: 0,
  metadata: null,
  // ICS-specific fields (null for user events)
  subscriptionId: null,
  uid: null,
  recurid: "",
  description: null,
  location: null,
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
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
};

export const mockIcsSubscription = {
  id: "ics-sub-1",
  userId: "test@example.com",
  name: "Work Calendar",
  url: "https://calendar.google.com/calendar/ical/test/basic.ics",
  lastSynced: null,
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
};

export const mockIcsEvent = {
  id: "ics-event-1",
  userId: "test@example.com",
  goalId: null,
  subscriptionId: "ics-sub-1",
  uid: "event-uid-123@google.com",
  recurid: "",
  title: "Team Standup",
  description: "Daily standup meeting",
  location: "Conference Room A",
  start: new Date("2024-06-01T10:00:00.000Z"),
  end: new Date("2024-06-01T10:30:00.000Z"),
  startTimezone: "America/New_York",
  endTimezone: "America/New_York",
  isAllDay: false,
  status: "CONFIRMED",
  organizer: "mailto:organizer@example.com",
  recurrenceRule: null,
  exdates: null,
  transparency: "OPAQUE",
  categories: null,
  url: null,
  rawData: "{}",
  kind: "ics",
  completed: false,
  confirmed: true,
  minutesEstimate: null,
  order: 0,
  metadata: null,
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
};
