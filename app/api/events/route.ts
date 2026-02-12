import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

// GET /api/events - Get all calendar events
export async function GET() {
  try {
    const userId = await requireAuth();

    const events = await prisma.calendarEvent.findMany({
      where: {
        userId,
      },
      orderBy: {
        start: "asc",
      },
    });

    // Transform to match FullCalendar format
    const transformedEvents = events.map((event) => {
      const parsedMeta = event.metadata ? JSON.parse(event.metadata) : {};
      const isGoalEvent = !!parsedMeta.goalId;

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
          ...parsedMeta,
        },
      };
    });

    return NextResponse.json(transformedEvents);
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
    const { title, start, end, kind, metadata } = body;

    const event = await prisma.calendarEvent.create({
      data: {
        userId,
        title,
        start: new Date(start).toISOString(),
        end: new Date(end).toISOString(),
        kind,
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
