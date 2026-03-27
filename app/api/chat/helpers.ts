import { tool } from "ai";
import type { UIMessage } from "ai";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import type { Goal, ChatHistoryRole } from "@/lib/generated/prisma";

// =============================================================================
// Base Tools - Shared by all AI agents
// =============================================================================

function buildBaseTools(chatHistoryId: string, userId: string) {
  return {
    askUserChoice: tool({
      description:
        "Ask the user to select from a list of choices. Use this when you need the user to make a decision between multiple options. The UI will render radio buttons for each choice, plus an 'Other' option where the user can type a custom answer. Wait for the user's selection before proceeding.",
      inputSchema: z.object({
        question: z.string().describe("The question to ask the user"),
        choices: z
          .array(z.string())
          .min(2)
          .max(6)
          .describe(
            "List of choices for the user to select from. An 'Other' option with a text input is automatically added."
          ),
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
  };
}

// =============================================================================
// GoalPlanner Tools
// =============================================================================

function buildGoalPlannerTools(goalId: string, userId: string) {
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

// =============================================================================
// Assistant Tools
// =============================================================================

function buildAssistantTools() {
  // Assistant-specific tools can be added here
  return {};
}

// =============================================================================
// Tool Builder - Combines base + role-specific tools
// =============================================================================

type ToolContext = {
  chatHistoryId: string;
  userId: string;
  role: ChatHistoryRole;
  goalId?: string;
};

export function buildTools(context: ToolContext) {
  const baseTools = buildBaseTools(context.chatHistoryId, context.userId);

  switch (context.role) {
    case "GoalPlanner":
      if (!context.goalId) {
        throw new Error("GoalPlanner requires a goalId");
      }
      return {
        ...baseTools,
        ...buildGoalPlannerTools(context.goalId, context.userId),
      };

    case "Assistant":
      return {
        ...baseTools,
        ...buildAssistantTools(),
      };

    default:
      return baseTools;
  }
}

// =============================================================================
// System Prompts
// =============================================================================

const BASE_GUIDELINES = `
- Ask questions one by one. When presenting multiple choice questions, use the askUserChoice tool to let the user select from options. The UI automatically includes an "Other" option where users can type a custom answer if none of the choices fit.
- Be conversational and helpful.`.trim();

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
${BASE_GUIDELINES}
- Keep tasks short and actionable.
- Avoid collisions with existing calendar events.
- Each task should need less than 2 hours.
- Schedule tasks during reasonable working hours.
- Spread tasks across available days before the due date.
- Each task should be 15-120 minutes.
- Order tasks in the sequence they should be done.
- If the user wants to add, remove, reschedule, or modify tasks, accommodate them and call saveTasks again with the updated list.
- Always call saveTasks proactively — do not wait for explicit user approval on the first proposal.`;
}

export function buildAssistantSystemPrompt(): string {
  const nowContext = `The current date/time is ${new Date().toLocaleString()}.`;

  return `You are a helpful AI assistant for a calendar and task management application.

${nowContext}

You can help users with:
- Answering questions about their schedule and tasks
- Providing advice on time management and productivity
- General assistance and conversation

Guidelines:
${BASE_GUIDELINES}
- Be concise and helpful.
- If the user asks about specific calendar events or tasks, let them know you can help manage their schedule.`;
}

type SystemPromptContext = {
  role: ChatHistoryRole;
  goal?: Goal;
};

export function buildSystemPrompt(context: SystemPromptContext): string {
  switch (context.role) {
    case "GoalPlanner":
      if (!context.goal) {
        throw new Error("GoalPlanner requires a goal");
      }
      return buildGoalSystemPrompt(context.goal);

    case "Assistant":
      return buildAssistantSystemPrompt();

    default:
      return buildAssistantSystemPrompt();
  }
}

// =============================================================================
// Chat History Persistence
// =============================================================================

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
