import { tool } from "ai";
import type { UIMessage } from "ai";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import type { Goal } from "@/lib/generated/prisma";

export function buildGoalTools(
  goalId: string,
  chatHistoryId: string,
  userId: string
) {
  return {
    askUserChoice: tool({
      description:
        "Ask the user to select from a list of choices. Use this when you need the user to make a decision between multiple options. The UI will render interactive buttons for the user to click. Wait for the user's selection before proceeding.",
      inputSchema: z.object({
        question: z.string().describe("The question to ask the user"),
        choices: z
          .array(z.string())
          .min(2)
          .max(6)
          .describe("List of choices for the user to select from"),
      }),
      // No execute function - result is provided by the frontend UI
    }),
    setChatTitle: tool({
      description:
        "Update the title of the current chat session. Use this to give the conversation a meaningful name based on what was discussed.",
      inputSchema: z.object({
        title: z
          .string()
          .min(1)
          .max(100)
          .describe("New title for the chat session"),
      }),
      execute: async ({ title }) => {
        try {
          await prisma.chatHistory.update({
            where: { id: chatHistoryId, userId },
            data: { title },
          });
          return { success: true, title };
        } catch {
          return { success: false, error: "Failed to update chat title" };
        }
      },
    }),
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
              end: z.string().describe("ISO 8601 end datetime for this task"),
            })
          )
          .min(1)
          .max(10),
      }),
      execute: async ({ tasks }) => {
        const goal = await prisma.goal.findFirst({
          where: { id: goalId, userId },
        });
        if (!goal) return { success: false, error: "Goal not found" };

        for (const t of tasks) {
          const s = new Date(t.start);
          const e = new Date(t.end);
          if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) {
            return {
              success: false,
              error: `Invalid date in task "${t.title}"`,
            };
          }
          if (e.getTime() <= s.getTime()) {
            return {
              success: false,
              error: `End must be after start in task "${t.title}"`,
            };
          }
        }

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

Your job contains 3 phases:
Phase 1 Detective mode:
1. The purpose of this phase is to precisely and accurately understand the needs of the user.
2. You should ask question to clarify details about the goal.

Phase 2 Draft mode:
1. Propose concrete and actionable tasks. For each task, assign a specific scheduled time period (start and end) spread across the days between now and the due date.
2. Present the tasks in a clear list showing: task title, scheduled date, time range, and duration.

Phase 3 Decision mode:
1. Ask the user for confirmation. If there is any problem, you can ask more question for further information and go back to Draft mode.
2. If everything is good to go, call the saveTask tool to submit the decision to the database.

Guidelines:
- Ask questions one by one. When presenting multiple choice questions, use the askUserChoice tool to let the user click their selection.
- Keep tasks short and actionable.
- Avoid collisions with existing calendar events.
- Each task should need less than 2 hours.
- Schedule tasks during reasonable working hours.
- Spread tasks across available days before the due date.
- Each task should be 15-120 minutes.
- Order tasks in the sequence they should be done.
- Be conversational and helpful. If the user wants to add, remove, reschedule, or modify tasks, accommodate them and call saveTasks again with the updated list.
- Always call saveTasks proactively — do not wait for explicit user approval on the first proposal.`;
}

export async function saveChatHistory(
  chatHistoryId: string,
  userId: string,
  providerId: string,
  modelId: string,
  allMessages: UIMessage[]
): Promise<void> {
  try {
    // Verify the chat history belongs to this user
    const chatHistory = await prisma.chatHistory.findUnique({
      where: { id: chatHistoryId },
      select: { userId: true },
    });

    if (!chatHistory) return;

    if (chatHistory.userId !== userId) {
      console.warn("Unauthorized attempt to modify chat history", {
        chatHistoryId,
        userId,
      });
      return;
    }

    await prisma.$transaction(async (tx) => {
      // Update provider/model info if not set
      await tx.chatHistory.update({
        where: { id: chatHistoryId },
        data: { providerId, modelId },
      });

      // Replace all messages
      await tx.message.deleteMany({
        where: { chatHistoryId },
      });

      if (allMessages.length > 0) {
        await tx.message.createMany({
          data: allMessages.map((msg, idx) => ({
            chatHistoryId,
            role: msg.role ?? "user",
            content: JSON.stringify(msg),
            order: idx,
          })),
        });
      }
    });
  } catch (e) {
    console.error("Failed to save chat history:", e);
  }
}
