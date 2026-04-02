import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { toCalendarEvent, toEventResponse } from "@/lib/event-serializer";

export async function GET(): Promise<NextResponse> {
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

    return NextResponse.json(events.map(toCalendarEvent));
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

export async function POST(req: Request): Promise<NextResponse> {
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
        start: new Date(start),
        end: new Date(end),
        kind,
        goalId: goalId || null,
        completed: completed ?? false,
        minutesEstimate: minutesEstimate ?? null,
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    });

    return NextResponse.json(toEventResponse(event), { status: 201 });
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
