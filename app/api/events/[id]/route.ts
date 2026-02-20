import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

// GET /api/events/:id - Get a specific event
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireAuth();
    const { id } = await params;

    const event = await prisma.event.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    return NextResponse.json({
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
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }
    console.error("Error fetching event:", error);
    return NextResponse.json(
      { error: "Failed to fetch event" },
      { status: 500 }
    );
  }
}

// PATCH /api/events/:id - Update an event
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireAuth();
    const { id } = await params;
    const body = await req.json();
    const { title, start, end, kind, metadata, completed, minutesEstimate } =
      body;

    // Verify event belongs to user
    const existingEvent = await prisma.event.findFirst({
      where: { id, userId },
    });

    if (!existingEvent) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const event = await prisma.event.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(start !== undefined && { start: new Date(start).toISOString() }),
        ...(end !== undefined && { end: new Date(end).toISOString() }),
        ...(kind !== undefined && { kind }),
        ...(completed !== undefined && { completed }),
        ...(minutesEstimate !== undefined && { minutesEstimate }),
        ...(metadata !== undefined && {
          metadata: metadata ? JSON.stringify(metadata) : null,
        }),
      },
    });

    return NextResponse.json({
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
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }
    console.error("Error updating event:", error);
    return NextResponse.json(
      { error: "Failed to update event" },
      { status: 500 }
    );
  }
}

// DELETE /api/events/:id - Delete an event
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireAuth();
    const { id } = await params;

    // Verify event belongs to user
    const existingEvent = await prisma.event.findFirst({
      where: { id, userId },
    });

    if (!existingEvent) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    await prisma.event.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Event deleted successfully" });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }
    console.error("Error deleting event:", error);
    return NextResponse.json(
      { error: "Failed to delete event" },
      { status: 500 }
    );
  }
}
