import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiHandler } from "@/lib/api-handler";
import { toCalendarEvent, toEventResponse } from "@/lib/event-serializer";

export const GET = apiHandler(async (userId) => {
  const events = await prisma.event.findMany({
    where: {
      userId,
    },
    orderBy: {
      start: "asc",
    },
  });

  return NextResponse.json(events.map(toCalendarEvent));
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

  return NextResponse.json(toEventResponse(event), { status: 201 });
});
