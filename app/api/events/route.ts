import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiHandler } from "@/lib/api-handler";

export const GET = apiHandler(async (userId) => {
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
    const isIcsEvent = !!event.subscriptionId;

    return {
      id: event.id,
      title: event.title,
      start: new Date(event.start),
      end: new Date(event.end),
      allDay: event.isAllDay,
      ...(isGoalEvent
        ? { backgroundColor: "#4F46E5", borderColor: "#4338CA" }
        : isIcsEvent
        ? { backgroundColor: "#059669", borderColor: "#047857" }
        : {}),
      extendedProps: {
        kind: event.kind || (isIcsEvent ? "ics" : undefined),
        goalId: event.goalId,
        completed: event.completed,
        minutesEstimate: event.minutesEstimate,
        subscriptionId: event.subscriptionId,
        location: event.location,
        status: event.status,
        description: event.description,
        isReadOnly: isIcsEvent,
        ...parsedMeta,
      },
    };
  });

  return NextResponse.json(transformedEvents);
});

export const POST = apiHandler(async (userId, req) => {
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
});
