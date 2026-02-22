import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

// GET /api/goals/:id - Get a specific goal
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireAuth();
    const { id } = await params;

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

// PUT /api/goals/:id - Update a goal
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireAuth();
    const { id } = await params;
    const body = await req.json();
    const { title, description, dueDate, events, infoTags } = body;

    // Verify goal belongs to user
    const existingGoal = await prisma.goal.findFirst({
      where: { id, userId },
    });

    if (!existingGoal) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 });
    }

    // Delete existing events and infoTags, then recreate them
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
            events?.map((d: any, index: number) => ({
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
            infoTags?.map((tag: any) => ({
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

// DELETE /api/goals/:id - Delete a goal
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireAuth();
    const { id } = await params;

    // Verify goal belongs to user
    const existingGoal = await prisma.goal.findFirst({
      where: { id, userId },
    });

    if (!existingGoal) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 });
    }

    // Delete the goal (cascade handles associated events)
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
