import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { verifyOwnership } from "@/lib/verify-ownership";

interface EventInput {
  title: string;
  start?: string;
  end?: string;
  completed?: boolean;
  minutesEstimate?: number;
}

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(
  _req: Request,
  ctx: RouteContext
): Promise<NextResponse> {
  try {
    const userId = await requireAuth();
    const { id } = await ctx.params;

    const goal = await verifyOwnership(
      prisma.goal.findFirst({
        where: { id, userId },
        include: {
          events: { orderBy: { order: "asc" } },
        },
      }),
      "Goal not found"
    );
    if (goal instanceof NextResponse) return goal;

    return NextResponse.json(goal);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }
    console.error("Error fetching goal:", error);
    return NextResponse.json(
      { error: "Failed to fetch goal" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: Request,
  ctx: RouteContext
): Promise<NextResponse> {
  try {
    const userId = await requireAuth();
    const { id } = await ctx.params;
    const body = await req.json();
    const { title, description, dueDate, events } = body;

    const existingGoal = await verifyOwnership(
      prisma.goal.findFirst({ where: { id, userId } }),
      "Goal not found"
    );
    if (existingGoal instanceof NextResponse) return existingGoal;

    await prisma.goal.update({
      where: { id },
      data: {
        events: {
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
              start: d.start ? new Date(d.start) : new Date(),
              end: d.end ? new Date(d.end) : new Date(),
              completed: d.completed ?? false,
              minutesEstimate: d.minutesEstimate,
              order: index,
            })) ?? [],
        },
      },
      include: {
        events: {
          orderBy: {
            order: "asc",
          },
        },
      },
    });

    return NextResponse.json(goal);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }
    console.error("Error updating goal:", error);
    return NextResponse.json(
      { error: "Failed to update goal" },
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

    const existingGoal = await verifyOwnership(
      prisma.goal.findFirst({ where: { id, userId } }),
      "Goal not found"
    );
    if (existingGoal instanceof NextResponse) return existingGoal;

    await prisma.goal.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Goal deleted successfully" });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }
    console.error("Error deleting goal:", error);
    return NextResponse.json(
      { error: "Failed to delete goal" },
      { status: 500 }
    );
  }
}
