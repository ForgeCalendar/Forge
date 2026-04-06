import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function GET(): Promise<NextResponse> {
  try {
    const userId = await requireAuth();

    const goals = await prisma.goal.findMany({
      where: {
        userId,
      },
      include: {
        events: {
          orderBy: {
            order: "asc",
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(goals);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }
    console.error("Error fetching goals:", error);
    return NextResponse.json(
      { error: "Failed to fetch goals" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request): Promise<NextResponse> {
  try {
    const userId = await requireAuth();
    const body = await req.json();
    const { title, description, dueDate } = body;

    // Create goal with its chat history in a single transaction
    const goal = await prisma.$transaction(async (tx) => {
      // First create the chat history with GoalPlanner role
      const chatHistory = await tx.chatHistory.create({
        data: {
          userId,
          title: `Goal: ${title}`,
          role: "GoalPlanner",
        },
      });

      // Then create the goal linked to the chat history
      return tx.goal.create({
        data: {
          userId,
          title,
          description,
          dueDate,
          chatHistoryId: chatHistory.id,
        },
        include: {
          events: true,
        },
      });
    });

    return NextResponse.json(goal, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }
    console.error("Error creating goal:", error);
    return NextResponse.json(
      { error: "Failed to create goal" },
      { status: 500 }
    );
  }
}
