import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiHandler } from "@/lib/api-handler";

interface EventInput {
  title: string;
  start?: string;
  end?: string;
  completed?: boolean;
  minutesEstimate?: number;
}

interface InfoTagInput {
  title: string;
  info: string;
}

type RouteContext = { params: Promise<{ id: string }> };

export const GET = apiHandler<RouteContext>(async (userId, _req, ctx) => {
  const { id } = await ctx.params;

  const goal = await prisma.goal.findFirst({
    where: {
      id,
      userId,
    },
    include: {
      events: {
        orderBy: {
          order: "asc",
        },
      },
      infoTags: true,
    },
  });

  if (!goal) {
    return NextResponse.json({ error: "Goal not found" }, { status: 404 });
  }

  return NextResponse.json(goal);
});

export const PUT = apiHandler<RouteContext>(async (userId, req, ctx) => {
  const { id } = await ctx.params;
  const body = await req.json();
  const { title, description, dueDate, events, infoTags } = body;

  const existingGoal = await prisma.goal.findFirst({
    where: { id, userId },
  });

  if (!existingGoal) {
    return NextResponse.json({ error: "Goal not found" }, { status: 404 });
  }

  await prisma.goal.update({
    where: { id },
    data: {
      events: {
        deleteMany: {},
      },
      infoTags: {
        deleteMany: {},
      },
    },
  });

  const goal = await prisma.goal.update({
    where: { id },
    data: {
      title,
      description,
      dueDate,
      events: {
        create:
          events?.map((d: EventInput, index: number) => ({
            userId,
            title: d.title,
            start: d.start || new Date().toISOString(),
            end: d.end || new Date().toISOString(),
            completed: d.completed ?? false,
            minutesEstimate: d.minutesEstimate,
            order: index,
          })) ?? [],
      },
      infoTags: {
        create:
          infoTags?.map((tag: InfoTagInput) => ({
            title: tag.title,
            info: tag.info,
          })) ?? [],
      },
    },
    include: {
      events: {
        orderBy: {
          order: "asc",
        },
      },
      infoTags: true,
    },
  });

  return NextResponse.json(goal);
});

export const DELETE = apiHandler<RouteContext>(async (userId, _req, ctx) => {
  const { id } = await ctx.params;

  const existingGoal = await prisma.goal.findFirst({
    where: { id, userId },
  });

  if (!existingGoal) {
    return NextResponse.json({ error: "Goal not found" }, { status: 404 });
  }

  await prisma.goal.delete({
    where: { id },
  });

  return NextResponse.json({ message: "Goal deleted successfully" });
});
