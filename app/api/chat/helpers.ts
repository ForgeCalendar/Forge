import { tool } from "ai";
import type { UIMessage } from "ai";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import type { Goal, ChatHistoryRole, Event } from "@/lib/generated/prisma";
import { RRule } from "rrule";

const TAVILY_SEARCH_ENDPOINT = "https://api.tavily.com/search";

type TavilySearchApiResponse = {
  results?: Array<{
    title?: string;
    url?: string;
    content?: string;
  }>;
  error?: string;
};

// =============================================================================
// Helper: Expand recurring events within a date range
// =============================================================================

type ExpandedEvent = {
  id: string;
  title: string;
  start: string;
  end: string;
  kind: string | null;
  isRecurringInstance: boolean;
  location: string | null;
  description: string | null;
};

function expandEventsInRange(
  events: Event[],
  rangeStart: Date,
  rangeEnd: Date
): ExpandedEvent[] {
  const results: ExpandedEvent[] = [];

  for (const event of events) {
    const isRecurringMaster = !!event.recurrenceRule && event.recurid === "";

    if (isRecurringMaster) {
      // Expand recurring event using rrule
      try {
        const rule = RRule.fromString(
          `DTSTART:${
            event.start.toISOString().replace(/[-:]/g, "").split(".")[0]
          }Z\nRRULE:${event.recurrenceRule}`
        );

        // Get occurrences within the range
        const occurrences = rule.between(rangeStart, rangeEnd, true);

        // Parse excluded dates
        const exdates: Set<string> = new Set();
        if (event.exdates) {
          const parsed = JSON.parse(event.exdates) as string[];
          for (const d of parsed) {
            exdates.add(new Date(d).toISOString().split("T")[0]);
          }
        }

        // Calculate duration
        const durationMs = event.end.getTime() - event.start.getTime();

        for (const occStart of occurrences) {
          // Skip excluded dates
          if (exdates.has(occStart.toISOString().split("T")[0])) {
            continue;
          }

          const occEnd = new Date(occStart.getTime() + durationMs);
          results.push({
            id: event.id,
            title: event.title,
            start: occStart.toISOString(),
            end: occEnd.toISOString(),
            kind: event.kind || (event.subscriptionId ? "ics" : "task"),
            isRecurringInstance: true,
            location: event.location,
            description: event.description,
          });
        }
      } catch {
        // If rrule parsing fails, skip this event
        console.error(
          `[expandEventsInRange] Failed to parse rrule for event ${event.id}`
        );
      }
    } else {
      // Non-recurring event: check if it falls within range
      const eventStart = event.start;
      const eventEnd = event.end;

      // Event overlaps with range if: eventStart < rangeEnd AND eventEnd > rangeStart
      if (eventStart < rangeEnd && eventEnd > rangeStart) {
        results.push({
          id: event.id,
          title: event.title,
          start: eventStart.toISOString(),
          end: eventEnd.toISOString(),
          kind: event.kind || (event.subscriptionId ? "ics" : "task"),
          isRecurringInstance: false,
          location: event.location,
          description: event.description,
        });
      }
    }
  }

  // Sort by start time
  results.sort(
    (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
  );

  return results;
}

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
    searchOnline: tool({
      description:
        "Search Online for up-to-date information. Uses Tavily. Use this when the user asks about recent events, external facts, or web information.",
      inputSchema: z.object({
        query: z
          .string()
          .min(2)
          .describe("Search query describing what to find on the web"),
        num: z
          .number()
          .int()
          .min(1)
          .max(5)
          .default(3)
          .describe("How many results to return (1-5)"),
      }),
      execute: async ({ query, num }) => {
        try {
          const config = await prisma.searchConfig.findUnique({
            where: { userId },
            select: { tavilyApiKey: true },
          });

          const tavilyApiKey =
            config?.tavilyApiKey ?? process.env.TAVILY_API_KEY;
          if (!tavilyApiKey) {
            return {
              success: false,
              error:
                "Tavily search is not configured. Add Tavily API key in Settings > Account.",
            };
          }

          const response = await fetch(TAVILY_SEARCH_ENDPOINT, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              api_key: tavilyApiKey,
              query,
              max_results: num,
              search_depth: "basic",
            }),
          });

          if (!response.ok) {
            return {
              success: false,
              error: `Tavily search request failed with status ${response.status}`,
            };
          }

          const data = (await response.json()) as TavilySearchApiResponse;

          if (data.error) {
            return {
              success: false,
              error: data.error,
            };
          }

          const results = (data.results ?? [])
            .filter((item) => item.title && item.url)
            .map((item) => ({
              title: item.title as string,
              url: item.url as string,
              snippet: item.content ?? "",
              source: "tavily",
            }));

          return {
            success: true,
            provider: "tavily",
            query,
            count: results.length,
            results,
          };
        } catch {
          return {
            success: false,
            error: "Failed to execute Search Online",
          };
        }
      },
    }),
    listEventsForPeriod: tool({
      description:
        "List all calendar events for a specific day or month. This includes user-created events, AI-proposed tasks, imported ICS calendar events, and recurring event instances. Use this when you need to see what's on the user's calendar for scheduling or context.",
      inputSchema: z.object({
        date: z
          .string()
          .optional()
          .describe(
            "Specific date in YYYY-MM-DD format to list events for that day. If provided, year and month are ignored."
          ),
        year: z
          .number()
          .int()
          .optional()
          .describe(
            "Year (e.g., 2024) for month view. Required if date is not provided."
          ),
        month: z
          .number()
          .int()
          .min(1)
          .max(12)
          .optional()
          .describe(
            "Month (1-12) for month view. Required if date is not provided."
          ),
      }),
      execute: async ({ date, year, month }) => {
        try {
          let rangeStart: Date;
          let rangeEnd: Date;
          let periodLabel: string;

          if (date) {
            // Day view: specific date
            const parsedDate = new Date(date);
            if (Number.isNaN(parsedDate.getTime())) {
              return {
                success: false,
                error: "Invalid date format. Use YYYY-MM-DD.",
              };
            }
            rangeStart = new Date(parsedDate);
            rangeStart.setHours(0, 0, 0, 0);
            rangeEnd = new Date(parsedDate);
            rangeEnd.setHours(23, 59, 59, 999);
            periodLabel = date;
          } else if (year !== undefined && month !== undefined) {
            // Month view: specific month
            rangeStart = new Date(year, month - 1, 1, 0, 0, 0, 0);
            rangeEnd = new Date(year, month, 0, 23, 59, 59, 999); // Last day of month
            periodLabel = `${year}-${String(month).padStart(2, "0")}`;
          } else {
            return {
              success: false,
              error:
                "Either 'date' (YYYY-MM-DD) or both 'year' and 'month' must be provided.",
            };
          }

          // Fetch all events for this user that might fall within range
          // For recurring events, we need to fetch all recurring masters
          // For non-recurring, we filter by date range
          const events = await prisma.event.findMany({
            where: {
              userId,
              OR: [
                // Non-recurring events within range
                {
                  recurrenceRule: null,
                  start: { lt: rangeEnd },
                  end: { gt: rangeStart },
                },
                // Recurring master events (we'll expand them)
                {
                  recurrenceRule: { not: null },
                  recurid: "",
                },
              ],
            },
          });

          const expandedEvents = expandEventsInRange(
            events,
            rangeStart,
            rangeEnd
          );

          return {
            success: true,
            period: periodLabel,
            count: expandedEvents.length,
            events: expandedEvents,
          };
        } catch (e) {
          console.error("[listEventsForPeriod] Error:", e);
          return { success: false, error: "Failed to list events" };
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
    listAllEvents: tool({
      description:
        "List all events related to this goal, including both confirmed and unconfirmed events. Use this to see the complete picture of what tasks exist for this goal.",
      inputSchema: z.object({}),
      execute: async () => {
        const events = await prisma.event.findMany({
          where: { goalId, userId },
          select: {
            id: true,
            title: true,
            start: true,
            end: true,
            minutesEstimate: true,
            order: true,
            confirmed: true,
            completed: true,
          },
          orderBy: { order: "asc" },
        });

        return {
          success: true,
          count: events.length,
          events: events.map((e) => ({
            id: e.id,
            title: e.title,
            start: e.start.toISOString(),
            end: e.end.toISOString(),
            minutesEstimate: e.minutesEstimate,
            order: e.order,
            confirmed: e.confirmed,
            completed: e.completed,
          })),
        };
      },
    }),
    listSuggestedEvents: tool({
      description:
        "List all suggested (unconfirmed) events for this goal. Use this to see what events have been proposed but not yet confirmed by the user.",
      inputSchema: z.object({}),
      execute: async () => {
        const events = await prisma.event.findMany({
          where: { goalId, userId, confirmed: false },
          select: {
            id: true,
            title: true,
            start: true,
            end: true,
            minutesEstimate: true,
            order: true,
          },
          orderBy: { order: "asc" },
        });

        return {
          success: true,
          count: events.length,
          events: events.map((e) => ({
            id: e.id,
            title: e.title,
            start: e.start.toISOString(),
            end: e.end.toISOString(),
            minutesEstimate: e.minutesEstimate,
            order: e.order,
          })),
        };
      },
    }),
    modifySuggestedEvent: tool({
      description:
        "Modify a specific suggested event. Use this to update the title, start time, or end time of an unconfirmed event. Only works for events with confirmed: false.",
      inputSchema: z.object({
        eventId: z.string().describe("The ID of the event to modify"),
        title: z.string().optional().describe("New title for the event"),
        start: z
          .string()
          .optional()
          .describe("New ISO 8601 start datetime for the event"),
        end: z
          .string()
          .optional()
          .describe("New ISO 8601 end datetime for the event"),
      }),
      execute: async ({ eventId, title, start, end }) => {
        // Verify the event exists and belongs to this goal
        const event = await prisma.event.findFirst({
          where: { id: eventId, goalId, userId, confirmed: false },
        });

        if (!event) {
          return {
            success: false,
            error:
              "Event not found or already confirmed. Only unconfirmed events can be modified.",
          };
        }

        // Validate dates if provided
        const updates: {
          title?: string;
          start?: Date;
          end?: Date;
          minutesEstimate?: number;
        } = {};

        if (title) updates.title = title;

        if (start) {
          const startDate = new Date(start);
          if (Number.isNaN(startDate.getTime())) {
            return { success: false, error: "Invalid start date format" };
          }
          updates.start = startDate;
        }

        if (end) {
          const endDate = new Date(end);
          if (Number.isNaN(endDate.getTime())) {
            return { success: false, error: "Invalid end date format" };
          }
          updates.end = endDate;
        }

        // Validate start < end if both are provided
        const finalStart = updates.start || event.start;
        const finalEnd = updates.end || event.end;
        if (finalEnd.getTime() <= finalStart.getTime()) {
          return { success: false, error: "End time must be after start time" };
        }

        // Calculate new minutesEstimate if times changed
        if (updates.start || updates.end) {
          updates.minutesEstimate = Math.round(
            (finalEnd.getTime() - finalStart.getTime()) / 60000
          );
        }

        // Update the event
        const updated = await prisma.event.update({
          where: { id: eventId },
          data: updates,
        });

        return {
          success: true,
          event: {
            id: updated.id,
            title: updated.title,
            start: updated.start.toISOString(),
            end: updated.end.toISOString(),
            minutesEstimate: updated.minutesEstimate,
          },
        };
      },
    }),
    deleteSuggestedEvent: tool({
      description:
        "Delete a specific suggested event. Use this to remove an unconfirmed event that is no longer needed. Only works for events with confirmed: false.",
      inputSchema: z.object({
        eventId: z.string().describe("The ID of the event to delete"),
      }),
      execute: async ({ eventId }) => {
        // Verify the event exists and belongs to this goal
        const event = await prisma.event.findFirst({
          where: { id: eventId, goalId, userId, confirmed: false },
        });

        if (!event) {
          return {
            success: false,
            error:
              "Event not found or already confirmed. Only unconfirmed events can be deleted.",
          };
        }

        await prisma.event.delete({
          where: { id: eventId },
        });

        return {
          success: true,
          deletedEventId: eventId,
          message: `Deleted event "${event.title}"`,
        };
      },
    }),
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
      return baseTools;

    case "TaskHelper":
      return baseTools;

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
- At any point in the conversation when you need context about the user, call listMemoryQuestions to see what you already know, then call searchMemoryAnswer for the specific questions relevant to the topic at hand. Use readMemories when you need a broad overview of all stored knowledge about the user.
- When you need current web information, call searchOnline before answering.
- When you need to see the user's calendar for a specific day or month, use listEventsForPeriod. This includes all events: user tasks, imported calendar events, and recurring event instances.
`.trim();

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

Managing events:
- Use listAllEvents to see all events for this goal (both confirmed and unconfirmed), including their completion status
- Use listSuggestedEvents to see only the events that have been proposed but not yet confirmed
- Use modifySuggestedEvent to update a specific event's title, start time, or end time (e.g., if user wants to reschedule one task)
- Use deleteSuggestedEvent to remove a specific event (e.g., if user says "remove the third task")
- Use suggestEvents to replace all events at once (useful for major changes)

Guidelines:
${BASE_GUIDELINES}
- Keep tasks short and actionable.
- Before scheduling tasks, use listEventsForPeriod to check the user's existing calendar for potential conflicts. Avoid collisions with existing calendar events.
- Each task should need less than 2 hours.
- Schedule tasks during reasonable working hours.
- Spread tasks across available days before the due date.
- Each task should be 15-120 minutes.
- Order tasks in the sequence they should be done.
- If the user wants to modify tasks, use fine-grained tools when appropriate:
  - For small changes (e.g., "move task 2 to 3pm", "rename the first task"), use modifySuggestedEvent or deleteSuggestedEvent
  - For major changes (e.g., "start over", "completely different approach"), use suggestEvents to replace all events
  - Call listSuggestedEvents first if you need to see what's currently proposed
- Always call suggestEvents proactively on the first proposal — do not wait for explicit user approval.
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

export function buildTaskHelperSystemPrompt(
  eventTitle: string,
  timezone: string
): string {
  const now = new Date();
  const nowInTimezone = now.toLocaleString("en-US", { timeZone: timezone });

  return `You are a focused Task Helper AI, dedicated to helping the user complete a specific task.

The user's timezone is ${timezone}.
The current date/time in the user's timezone is ${nowInTimezone}.

Current task: "${eventTitle}"

Your role:
- Help the user work through this specific task with focus and efficiency
- Break down the task into smaller steps if needed
- Answer questions related to completing this task
- Provide relevant information, tips, or resources
- Keep the user motivated and on track
- Be concise and actionable - the user is in "zen mode" and wants to stay focused

Guidelines:
${BASE_GUIDELINES}
- Stay focused on the current task at hand
- Be encouraging but brief
- Suggest concrete next steps when appropriate
- If the user gets distracted, gently guide them back to the task
- Celebrate progress and completion milestones`;
}

type SystemPromptContext = {
  role: ChatHistoryRole;
  goal?: Goal;
  eventTitle?: string;
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

    case "TaskHelper":
      if (!context.eventTitle) {
        throw new Error("TaskHelper requires an eventTitle");
      }
      return buildTaskHelperSystemPrompt(context.eventTitle, timezone);

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
