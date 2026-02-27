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
              "Save the proposed tasks for the goal as calendar events. Each task must have a scheduled start and end time (ISO 8601). Call this proactively after proposing tasks.",
            inputSchema: z.object({
              tasks: z
                .array(
                  z.object({
                    title: z.string().describe("Short, actionable task title"),
                    start: z
                      .string()
                      .describe("ISO 8601 start datetime for this task"),
                    end: z
                      .string()
                      .describe("ISO 8601 end datetime for this task"),
                  })
                )
                .min(1)
                .max(10),
            }),
            execute: async ({ tasks }) => {
              const goal = await prisma.goal.findUnique({
                where: { id: goalId },
              });
              if (!goal) return { success: false, error: "Goal not found" };

              // Delete any existing events for this goal (idempotent)
              await prisma.event.deleteMany({ where: { goalId } });

              const savedEvents = [];

              for (let i = 0; i < tasks.length; i++) {
                const taskStart = new Date(tasks[i].start);
                const taskEnd = new Date(tasks[i].end);
                const minutesEstimate = Math.round(
                  (taskEnd.getTime() - taskStart.getTime()) / 60000
                );

                await prisma.event.create({
                  data: {
                    userId: goal.userId,
                    goalId,
                    title: tasks[i].title,
                    start: taskStart.toISOString(),
                    end: taskEnd.toISOString(),
                    kind: "task",
                    minutesEstimate,
                    order: i,
                    completed: false,
                  },
                });

                savedEvents.push({
                  title: tasks[i].title,
                  start: taskStart.toISOString(),
                  end: taskEnd.toISOString(),
                  minutesEstimate,
                });
              }

              return {
                success: true,
                taskCount: tasks.length,
                savedEvents,
              };
            },
          }),
        }
      : undefined;

    // Build system prompt for goal decomposition if goalId is present
    let system: string | undefined;
    if (goalId) {
      const goal = await prisma.goal.findUnique({
        where: { id: goalId },
      });
      if (goal) {
        const dueDateContext = goal.dueDate
          ? `The goal is due on ${new Date(goal.dueDate).toLocaleString()}.`
          : "There is no specific due date.";
        const nowContext = `The current date/time is ${new Date().toLocaleString()}.`;
        system = `You are an AI assistant helping the user break down a goal into scheduled calendar events.

The user just created a goal:
- Title: ${goal.title}
- Description: ${goal.description}
- ${dueDateContext}
- ${nowContext}

Your job:
1. Immediately propose 3-7 concrete, actionable tasks. For each task, assign a specific scheduled time period (start and end) spread across the days between now and the due date.
2. Present the tasks in a clear list showing: task title, scheduled date, time range, and duration.
3. Call the saveTasks tool right away with the scheduled times so they appear on the calendar immediately.
4. After saving, show the user what was saved with times, and let them know they can adjust — if they request changes, update the tasks and call saveTasks again.

Guidelines:
- Keep task titles short and actionable.
- Schedule tasks during reasonable working hours (9am-6pm).
- Spread tasks across available days before the due date.
- Each task should be 15-120 minutes.
- Order tasks in the sequence they should be done.
- Be conversational and helpful. If the user wants to add, remove, reschedule, or modify tasks, accommodate them and call saveTasks again with the updated list.
- Always call saveTasks proactively — do not wait for explicit user approval on the first proposal.`;
      }
    }

    const result = streamText({
      model: anthropic("claude-sonnet-4-5-20250929"),
      messages: await convertToModelMessages(messages),
      ...(system ? { system } : {}),
      ...(tools ? { tools, maxSteps: 10 } : {}),
    });

    return result.toUIMessageStreamResponse({
      originalMessages: messages,
      onFinish: async ({ messages: allMessages }) => {
        if (goalId) {
          try {
            await prisma.goal.update({
              where: { id: goalId },
              data: { chatHistory: JSON.stringify(allMessages) },
            });
          } catch (e) {
            console.error("Failed to save chat history:", e);
          }
        }
      },
    });
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
