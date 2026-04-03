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
    saveMemory: tool({
      description:
        "IMPORTANT: This tool does not send any visible response to the user. You MUST include a text message (e.g. 'I'll remember that for next time.') when calling this tool. Save a Q&A memory about the user. Use this when you learn something notable about the user — their preferences, habits, occupation, constraints, or any personal detail that would help personalize future conversations. The question should be a general key (e.g. 'What is your occupation?') and the answer should capture what you learned. If a memory for the same question already exists, it will be updated.",
      inputSchema: z.object({
        question: z
          .string()
          .describe(
            "A short key question describing the characteristic, e.g. 'What is your occupation?'"
          ),
        answer: z
          .string()
          .describe(
            "The user's answer or characteristic you observed from the conversation"
          ),
      }),
      execute: async ({ question, answer }) => {
        console.log(
          "[saveMemory] userId:",
          userId,
          "question:",
          question,
          "answer:",
          answer
        );
        try {
          const existing = await prisma.memory.findFirst({
            where: { userId, question },
          });
          if (existing) {
            await prisma.memory.update({
              where: { id: existing.id },
              data: { answer },
            });
            console.log("[saveMemory] Updated existing memory:", existing.id);
            return { success: true, action: "updated", question, answer };
          }
          const created = await prisma.memory.create({
            data: { userId, question, answer },
          });
          console.log("[saveMemory] Created new memory:", created.id);
          return { success: true, action: "created", question, answer };
        } catch (e) {
          console.error("[saveMemory] Error:", e);
          return { success: false, error: "Failed to save memory" };
        }
      },
    }),
    readMemories: tool({
      description:
        "IMPORTANT: This tool does not send any visible response to the user. You MUST include a text message that incorporates what you learned naturally into your response. Retrieve stored memories about the user. Use this at the start of a conversation or whenever you need context about the user's preferences, habits, or characteristics to give a more personalized response. You can optionally filter by a keyword to find specific memories.",
      inputSchema: z.object({
        keyword: z
          .string()
          .optional()
          .describe(
            "Optional keyword to filter memories by question content. If omitted, all memories are returned."
          ),
      }),
      execute: async ({ keyword }) => {
        console.log("[readMemories] userId:", userId, "keyword:", keyword);
        try {
          const memories = await prisma.memory.findMany({
            where: {
              userId,
              ...(keyword ? { question: { contains: keyword } } : {}),
            },
            select: { question: true, answer: true, updatedAt: true },
            orderBy: { updatedAt: "desc" },
          });
          console.log("[readMemories] Found", memories.length, "memories");
          return { success: true, memories, count: memories.length };
        } catch (e) {
          console.error("[readMemories] Error:", e);
          return { success: false, error: "Failed to read memories" };
        }
      },
    }),
    listMemoryQuestions: tool({
      description:
        "IMPORTANT: This tool does not send any visible response to the user. You MUST include a text message when calling this tool. List all stored memory questions (keys) about the user, without their answers. Use this at the start of a conversation to quickly see what you already know about the user, then selectively fetch specific answers with searchMemoryAnswer.",
      inputSchema: z.object({}),
      execute: async () => {
        console.log("[listMemoryQuestions] userId:", userId);
        try {
          const memories = await prisma.memory.findMany({
            where: { userId },
            select: { question: true },
            orderBy: { updatedAt: "desc" },
          });
          console.log(
            "[listMemoryQuestions] Found",
            memories.length,
            "questions"
          );
          return {
            success: true,
            questions: memories.map((m) => m.question),
            count: memories.length,
          };
        } catch (e) {
          console.error("[listMemoryQuestions] Error:", e);
          return { success: false, error: "Failed to list memory questions" };
        }
      },
    }),
    searchMemoryAnswer: tool({
      description:
        "IMPORTANT: This tool does not send any visible response to the user. You MUST include a text message that incorporates what you learned naturally into your response. Look up the stored answer for a specific memory question. Use this after calling listMemoryQuestions to retrieve the answer for a question that is relevant to the current conversation.",
      inputSchema: z.object({
        question: z
          .string()
          .describe(
            "The exact question string to look up, as returned by listMemoryQuestions"
          ),
      }),
      execute: async ({ question }) => {
        console.log(
          "[searchMemoryAnswer] userId:",
          userId,
          "question:",
          question
        );
        try {
          const memory = await prisma.memory.findFirst({
            where: { userId, question },
            select: { question: true, answer: true, updatedAt: true },
          });
          if (!memory) {
            console.log("[searchMemoryAnswer] No memory found for:", question);
            return {
              success: false,
              error: "No memory found for that question",
            };
          }
          console.log("[searchMemoryAnswer] Found answer for:", question);
          return { success: true, ...memory };
        } catch (e) {
          console.error("[searchMemoryAnswer] Error:", e);
          return { success: false, error: "Failed to search memory" };
        }
      },
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
    suggestEvents: tool({
      description:
        "Suggest events for the goal as calendar events. Each event must have a scheduled start and end time (ISO 8601). Call this proactively after proposing tasks.",
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
          .min(1),
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
              start: taskStart,
              end: taskEnd,
              kind: "task",
              minutesEstimate,
              order: i,
              completed: false,
              confirmed: false, // AI-proposed tasks require user confirmation
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
- Be conversational and helpful.
- When you learn something notable about the user (e.g. their occupation, work schedule, preferences, constraints, hobbies), use the saveMemory tool to remember it for future conversations. Only save information that would be useful across sessions — do not save trivial or one-off details.
- At any point in the conversation when you need context about the user, call listMemoryQuestions to see what you already know, then call searchMemoryAnswer for the specific questions relevant to the topic at hand. Use readMemories when you need a broad overview of all stored knowledge about the user.`.trim();

export function buildGoalSystemPrompt(goal: Goal, timezone: string): string {
  const now = new Date();
  const nowInTimezone = now.toLocaleString("en-US", { timeZone: timezone });
  const dueDateContext = goal.dueDate
    ? `The goal is due on ${goal.dueDate.toLocaleString("en-US", {
        timeZone: timezone,
      })}.`
    : "There is no specific due date.";

  return `You are an AI assistant helping the user break down a goal into scheduled calendar events.

The user's timezone is ${timezone}.
The current date/time in the user's timezone is ${nowInTimezone}.

The user just created a goal:
- Title: ${goal.title}
- Description: ${goal.description}
- ${dueDateContext}

Your job contains 3 phases:
Phase 1 Detective mode:
1. The purpose of this phase is to precisely and accurately understand the needs of the user.
2. You should ask question to clarify details about the goal.

Phase 2 Draft mode:
1. Propose concrete and actionable tasks. For each task, assign a specific scheduled time period (start and end) spread across the days between now and the due date.
2. Call suggestEvents to display the proposed events. Do NOT list out the events in text — the tool will render them visually for the user.

Phase 3 Decision mode:
1. Ask the user for confirmation. If there is any problem, you can ask more question for further information and go back to Draft mode.
2. If everything is good to go, call the suggestEvents tool to submit the decision to the database.

Guidelines:
${BASE_GUIDELINES}
- Keep tasks short and actionable.
- Avoid collisions with existing calendar events.
- Each task should need less than 2 hours.
- Schedule tasks during reasonable working hours.
- Spread tasks across available days before the due date.
- Each task should be 15-120 minutes.
- Order tasks in the sequence they should be done.
- If the user wants to add, remove, reschedule, or modify tasks, accommodate them and call suggestEvents again with the updated list.
- Always call suggestEvents proactively — do not wait for explicit user approval on the first proposal.
- IMPORTANT: When specifying event times, use the user's timezone (${timezone}). All ISO 8601 datetime strings should reflect times in the user's local timezone.`;
}

export function buildAssistantSystemPrompt(timezone: string): string {
  const now = new Date();
  const nowInTimezone = now.toLocaleString("en-US", { timeZone: timezone });

  return `You are a helpful AI assistant for a calendar and task management application.

The user's timezone is ${timezone}.
The current date/time in the user's timezone is ${nowInTimezone}.

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
  timezone: string;
};

export function buildSystemPrompt(context: SystemPromptContext): string {
  const timezone = context.timezone || "UTC";

  switch (context.role) {
    case "GoalPlanner":
      if (!context.goal) {
        throw new Error("GoalPlanner requires a goal");
      }
      return buildGoalSystemPrompt(context.goal, timezone);

    case "Assistant":
      return buildAssistantSystemPrompt(timezone);

    default:
      return buildAssistantSystemPrompt(timezone);
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
