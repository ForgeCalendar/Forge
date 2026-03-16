import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

interface InfoTagInput {
  title: string;
  info: string;
}

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
        infoTags: true,
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
    const { title, description, dueDate, infoTags } = body;

    const goal = await prisma.goal.create({
      data: {
        userId,
        title,
        description,
        dueDate,
        infoTags: {
          create:
            infoTags?.map((tag: InfoTagInput) => ({
              title: tag.title,
              info: tag.info,
            })) ?? [],
        },
      },
      include: {
        events: true,
        infoTags: true,
      },
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
