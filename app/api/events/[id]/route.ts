import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiHandler } from "@/lib/api-handler";

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
