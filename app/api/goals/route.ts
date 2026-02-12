import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { decomposeGoal } from "@/lib/ai/decompose-goal";
import { AIProvider } from "@/lib/generated/prisma";

export const maxDuration = 30;

// GET /api/goals - Get all goals with their events and infoTags
export async function GET() {
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

// POST /api/goals - Create a new goal
export async function POST(req: Request) {
  try {
    const userId = await requireAuth();
    const body = await req.json();
    const { title, description, dueDate, infoTags } = body;

    // Create the goal (without events)
    const goal = await prisma.goal.create({
      data: {
        userId,
        title,
        description,
        dueDate,
        infoTags: {
          create:
            infoTags?.map((tag: any) => ({
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

    // AI-powered goal decomposition
    // If this fails (no API key, bad key, rate limit), the goal is still
    // returned successfully — just without AI-generated tasks.
    try {
      const apiKeyRecord = await prisma.aIAgentApiKey.findUnique({
        where: {
          userId_provider: {
            userId,
            provider: AIProvider.ANTHROPIC,
          },
        },
      });

      if (apiKeyRecord) {
        console.log("[Goal API] Decomposing goal with AI:", title);

        const tasks = await decomposeGoal({
          apiKey: apiKeyRecord.apiKey,
          goalTitle: title,
          goalDescription: description ?? "",
          dueDate: dueDate ?? null,
        });

        console.log("[Goal API] AI generated", tasks.length, "tasks");

        // Save tasks as Event records linked to the goal
        for (let i = 0; i < tasks.length; i++) {
          await prisma.event.create({
            data: {
              goalId: goal.id,
              title: tasks[i].title,
              minutesEstimate: tasks[i].minutesEstimate,
              order: i,
              completed: false,
            },
          });
        }

        // Create CalendarEvents from the tasks, spread before due date
        if (dueDate) {
          const goalDueDate = new Date(dueDate);
          const now = new Date();
          const totalMs = Math.max(
            60 * 60 * 1000,
            goalDueDate.getTime() - now.getTime()
          );

          for (let i = 0; i < tasks.length; i++) {
            const taskDurationMs = tasks[i].minutesEstimate * 60 * 1000;
            const fraction = (i + 1) / (tasks.length + 1);
            const eventStart = new Date(now.getTime() + fraction * totalMs);
            const eventEnd = new Date(eventStart.getTime() + taskDurationMs);

            await prisma.calendarEvent.create({
              data: {
                userId,
                title: tasks[i].title,
                start: eventStart.toISOString(),
                end: eventEnd.toISOString(),
                kind: "task",
                metadata: JSON.stringify({
                  goalId: goal.id,
                  goalTitle: title,
                  taskIndex: i,
                  minutesEstimate: tasks[i].minutesEstimate,
                }),
              },
            });
          }
          console.log(
            "[Goal API] Created",
            tasks.length,
            "calendar events from AI tasks"
          );
        }
      } else {
        console.log(
          "[Goal API] No Anthropic API key found, skipping AI decomposition"
        );
      }
    } catch (aiError) {
      console.error(
        "[Goal API] AI decomposition failed, goal created without tasks:",
        aiError
      );
    }

    // Re-fetch the goal to include any AI-generated events
    const goalWithEvents = await prisma.goal.findUnique({
      where: { id: goal.id },
      include: {
        events: { orderBy: { order: "asc" } },
        infoTags: true,
      },
    });

    return NextResponse.json(goalWithEvents, { status: 201 });
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
