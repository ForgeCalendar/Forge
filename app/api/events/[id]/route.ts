import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiHandler } from "@/lib/api-handler";
import { toEventResponse } from "@/lib/event-serializer";

type RouteContext = { params: Promise<{ id: string }> };

export const GET = apiHandler<RouteContext>(async (userId, _req, ctx) => {
  const { id } = await ctx.params;

  const event = await prisma.event.findFirst({
    where: {
      id,
      userId,
    },
  });

  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  return NextResponse.json(toEventResponse(event));
});

export const PATCH = apiHandler<RouteContext>(async (userId, req, ctx) => {
  const { id } = await ctx.params;
  const body = await req.json();
  const { title, start, end, kind, metadata, completed, minutesEstimate } =
    body;

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

  return NextResponse.json(toEventResponse(event));
});

export const DELETE = apiHandler<RouteContext>(async (userId, _req, ctx) => {
  const { id } = await ctx.params;

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
});
