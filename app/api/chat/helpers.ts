import { tool } from "ai";
import type { UIMessage } from "ai";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import type { Goal } from "@/lib/generated/prisma";

export function buildGoalTools(goalId: string) {
  return {
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
  };
}

export function buildGoalSystemPrompt(goal: Goal): string {
  const dueDateContext = goal.dueDate
    ? `The goal is due on ${new Date(goal.dueDate).toLocaleString()}.`
    : "There is no specific due date.";
  const nowContext = `The current date/time is ${new Date().toLocaleString()}.`;

  return `You are an AI assistant helping the user break down a goal into scheduled calendar events.

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

export async function saveChatHistory(
  goalId: string,
  userId: string,
  providerId: string,
  modelId: string,
  allMessages: UIMessage[]
): Promise<void> {
  try {
    const goal = await prisma.goal.findUnique({
      where: { id: goalId },
      select: { chatHistoryId: true, userId: true },
    });
    if (!goal) return;

    if (goal.userId !== userId) {
      console.warn("Unauthorized attempt to modify goal chat history", {
        goalId,
        userId,
      });
      return;
    }

    if (goal.chatHistoryId) {
      await prisma.$transaction(async (tx) => {
        await tx.message.deleteMany({
          where: { chatHistoryId: goal.chatHistoryId! },
        });

        if (allMessages.length > 0) {
          await tx.message.createMany({
            data: allMessages.map((msg, idx) => ({
              chatHistoryId: goal.chatHistoryId!,
              role: msg.role ?? "user",
              content: JSON.stringify(msg),
              order: idx,
            })),
          });
        }
      });
    } else {
      await prisma.$transaction(async (tx) => {
        const chatHistory = await tx.chatHistory.create({
          data: {
            userId: goal.userId,
            providerId,
            modelId,
            messages: {
              create: allMessages.map((msg, idx) => ({
                role: msg.role ?? "user",
                content: JSON.stringify(msg),
                order: idx,
              })),
            },
          },
        });

        await tx.goal.update({
          where: { id: goalId },
          data: { chatHistoryId: chatHistory.id },
        });
      });
    }
  } catch (e) {
    console.error("Failed to save chat history:", e);
  }
}
