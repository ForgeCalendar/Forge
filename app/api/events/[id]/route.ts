import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { toEventResponse } from "@/lib/event-serializer";
import { verifyOwnership } from "@/lib/verify-ownership";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(
  _req: Request,
  ctx: RouteContext
): Promise<NextResponse> {
  try {
    const userId = await requireAuth();
    const { id } = await ctx.params;

    const event = await verifyOwnership(
      prisma.event.findFirst({ where: { id, userId } }),
      "Event not found"
    );
    if (event instanceof NextResponse) return event;

    return NextResponse.json(toEventResponse(event));
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

export async function PATCH(
  req: Request,
  ctx: RouteContext
): Promise<NextResponse> {
  try {
    const userId = await requireAuth();
    const { id } = await ctx.params;
    const body = await req.json();
    const { title, start, end, kind, metadata, completed, minutesEstimate } =
      body;

    const existingEvent = await verifyOwnership(
      prisma.event.findFirst({ where: { id, userId } }),
      "Event not found"
    );
    if (existingEvent instanceof NextResponse) return existingEvent;

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

    return NextResponse.json(toEventResponse(event));
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

export async function DELETE(
  _req: Request,
  ctx: RouteContext
): Promise<NextResponse> {
  try {
    const userId = await requireAuth();
    const { id } = await ctx.params;

    const existingEvent = await verifyOwnership(
      prisma.event.findFirst({ where: { id, userId } }),
      "Event not found"
    );
    if (existingEvent instanceof NextResponse) return existingEvent;

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
