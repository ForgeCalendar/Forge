import { createAnthropic } from "@ai-sdk/anthropic";
import { convertToModelMessages, streamText, tool } from "ai";
import { z } from "zod";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { AIProvider } from "@/lib/generated/prisma";

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    // Authenticate the user
    const userId = await requireAuth();

    // Get the provider from query params
    const url = new URL(req.url);
    const provider = url.searchParams.get("provider");

    if (!provider) {
      return NextResponse.json(
        { error: "Provider parameter is required" },
        { status: 400 }
      );
    }

    // Validate provider
    if (!Object.values(AIProvider).includes(provider as AIProvider)) {
      return NextResponse.json(
        {
          error: `Invalid provider. Must be one of: ${Object.values(
            AIProvider
          ).join(", ")}`,
        },
        { status: 400 }
      );
    }

    // Fetch the user's API key for the specified provider
    const apiKeyRecord = await prisma.aIAgentApiKey.findUnique({
      where: {
        userId_provider: {
          userId,
          provider: provider as AIProvider,
        },
      },
    });

    if (!apiKeyRecord) {
      return NextResponse.json(
        {
          error: `No API key found for provider '${provider}'. Please add one in settings.`,
        },
        { status: 404 }
      );
    }

    // Check for optional goalId (enables goal decomposition tools)
    const goalId = url.searchParams.get("goalId");

    // Parse request body
    const { messages } = await req.json();

    // Create the Anthropic provider with the user's API key
    const anthropic = createAnthropic({
      apiKey: apiKeyRecord.apiKey,
    });

    // Define tools conditionally when decomposing a goal
    const tools = goalId
      ? {
          saveTasks: tool({
            description:
              "Save the proposed tasks for the goal. Call this when the user approves the task breakdown or asks you to save.",
            inputSchema: z.object({
              tasks: z
                .array(
                  z.object({
                    title: z
                      .string()
                      .describe("Short, actionable task title"),
                    minutesEstimate: z
                      .number()
                      .int()
                      .positive()
                      .describe("Estimated minutes to complete"),
                  })
                )
                .min(1)
                .max(10),
            }),
            execute: async ({ tasks }) => {
              const goal = await prisma.goal.findUnique({
                where: { id: goalId },
              });
              if (!goal)
                return { success: false, error: "Goal not found" };

              // Delete any existing events for this goal (idempotent)
              await prisma.event.deleteMany({ where: { goalId } });

              // Create Event records (goal subtasks)
              for (let i = 0; i < tasks.length; i++) {
                await prisma.event.create({
                  data: {
                    goalId,
                    title: tasks[i].title,
                    minutesEstimate: tasks[i].minutesEstimate,
                    order: i,
                    completed: false,
                  },
                });
              }

              // Create CalendarEvents if the goal has a due date
              if (goal.dueDate) {
                // Delete old AI-generated calendar events for this goal
                const existingCalEvents =
                  await prisma.calendarEvent.findMany({
                    where: { userId: goal.userId },
                  });
                for (const ce of existingCalEvents) {
                  if (ce.metadata) {
                    const meta = JSON.parse(ce.metadata);
                    if (meta.goalId === goalId) {
                      await prisma.calendarEvent.delete({
                        where: { id: ce.id },
                      });
                    }
                  }
                }

                const goalDueDate = new Date(goal.dueDate);
                const now = new Date();
                const totalMs = Math.max(
                  60 * 60 * 1000,
                  goalDueDate.getTime() - now.getTime()
                );

                for (let i = 0; i < tasks.length; i++) {
                  const taskDurationMs =
                    tasks[i].minutesEstimate * 60 * 1000;
                  const fraction = (i + 1) / (tasks.length + 1);
                  const eventStart = new Date(
                    now.getTime() + fraction * totalMs
                  );
                  const eventEnd = new Date(
                    eventStart.getTime() + taskDurationMs
                  );

                  await prisma.calendarEvent.create({
                    data: {
                      userId: goal.userId,
                      title: tasks[i].title,
                      start: eventStart.toISOString(),
                      end: eventEnd.toISOString(),
                      kind: "task",
                      metadata: JSON.stringify({
                        goalId,
                        goalTitle: goal.title,
                        taskIndex: i,
                        minutesEstimate: tasks[i].minutesEstimate,
                      }),
                    },
                  });
                }
              }

              return {
                success: true,
                taskCount: tasks.length,
                calendarEventsCreated: !!goal.dueDate,
              };
            },
          }),
        }
      : undefined;

    const result = streamText({
      model: anthropic("claude-sonnet-4-5-20250929"),
      messages: await convertToModelMessages(messages),
      ...(tools ? { tools, maxSteps: 3 } : {}),
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }
    console.error("Error in chat endpoint:", error);
    return NextResponse.json(
      { error: "Failed to process chat request" },
      { status: 500 }
    );
  }
}
