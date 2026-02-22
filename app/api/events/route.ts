import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

// GET /api/events - Get all calendar events
export async function GET() {
  try {
    const userId = await requireAuth();

    const events = await prisma.event.findMany({
      where: {
        userId,
      },
      orderBy: {
        start: "asc",
      },
    });

    const transformedEvents = events.map((event) => {
      const parsedMeta = event.metadata ? JSON.parse(event.metadata) : {};
      const isGoalEvent = !!event.goalId;

      return {
        id: event.id,
        title: event.title,
        start: new Date(event.start),
        end: new Date(event.end),
        ...(isGoalEvent
          ? { backgroundColor: "#4F46E5", borderColor: "#4338CA" }
          : {}),
        extendedProps: {
          kind: event.kind,
          goalId: event.goalId,
          completed: event.completed,
          minutesEstimate: event.minutesEstimate,
          ...parsedMeta,
        },
      };
    });

    const icsEvents = await prisma.icsEvent.findMany({
      where: {
        subscription: { userId },
      },
      orderBy: { start: "asc" },
    });

    const transformedIcsEvents = icsEvents.map((icsEvent) => ({
      id: `ics-${icsEvent.id}`,
      title: icsEvent.summary ?? "(No title)",
      start: new Date(icsEvent.start),
      end: icsEvent.end ? new Date(icsEvent.end) : new Date(icsEvent.start),
      allDay: icsEvent.isAllDay,
      backgroundColor: "#059669",
      borderColor: "#047857",
      extendedProps: {
        kind: "ics",
        subscriptionId: icsEvent.subscriptionId,
        location: icsEvent.location,
        status: icsEvent.status,
        isReadOnly: true,
      },
    }));

    return NextResponse.json([...transformedEvents, ...transformedIcsEvents]);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }
    console.error("Error fetching events:", error);
    return NextResponse.json(
      { error: "Failed to fetch events" },
      { status: 500 }
    );
  }
}

// POST /api/events - Create a new calendar event
export async function POST(req: Request) {
  try {
    const userId = await requireAuth();
    const body = await req.json();
    const {
      title,
      start,
      end,
      kind,
      metadata,
      goalId,
      completed,
      minutesEstimate,
    } = body;

    const event = await prisma.event.create({
      data: {
        userId,
        title,
        start: new Date(start).toISOString(),
        end: new Date(end).toISOString(),
        kind,
        goalId: goalId || null,
        completed: completed ?? false,
        minutesEstimate: minutesEstimate ?? null,
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    });

    return NextResponse.json(
      {
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
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }
    console.error("Error creating event:", error);
    return NextResponse.json(
      { error: "Failed to create event" },
      { status: 500 }
    );
  }
}
