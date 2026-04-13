/**
 * Server-side tool execution logic.
 * This module centralizes all tool execution that requires database access.
 */

import { prisma } from "@/lib/prisma";
import { toolSchemas, type ToolName } from "./schemas";

const TAVILY_SEARCH_ENDPOINT = "https://api.tavily.com/search";

type TavilySearchApiResponse = {
  results?: Array<{
    title?: string;
    url?: string;
    content?: string;
  }>;
  error?: string;
};

/**
 * Execute a tool on the server with the given parameters.
 *
 * @param toolName - Name of the tool to execute
 * @param params - Input parameters for the tool
 * @param userId - ID of the authenticated user
 * @param context - Additional context (chatHistoryId, goalId, etc.)
 * @returns Tool execution result
 */
export async function executeToolServer(
  toolName: ToolName,
  params: any,
  userId: string,
  context: {
    chatHistoryId?: string;
    goalId?: string;
  } = {}
): Promise<any> {
  // Validate params with Zod schema
  const schema = toolSchemas[toolName];
  if (!schema) {
    throw new Error(`Unknown tool: ${toolName}`);
  }

  const validated = schema.inputSchema.parse(params);

  // Execute the tool based on its name
  switch (toolName) {
    // =============================================================================
    // Base Tools
    // =============================================================================

    case "saveMemory": {
      const { question, answer } = validated as {
        question: string;
        answer: string;
      };
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
    }

    case "readMemories": {
      const { keyword } = validated as { keyword?: string };
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
    }

    case "listMemoryQuestions": {
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
    }

    case "searchMemoryAnswer": {
      const { question } = validated as { question: string };
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
    }

    case "setChatTitle": {
      const { title } = validated as { title: string };

      if (!context.chatHistoryId) {
        return { success: false, error: "No chat history ID provided" };
      }

      try {
        await prisma.chatHistory.update({
          where: { id: context.chatHistoryId, userId },
          data: { title },
        });
        return { success: true, title };
      } catch {
        return { success: false, error: "Failed to update chat title" };
      }
    }

    case "searchOnline": {
      const { query, num } = validated as { query: string; num: number };

      try {
        const config = await prisma.searchConfig.findUnique({
          where: { userId },
          select: { tavilyApiKey: true },
        });

        const tavilyApiKey = config?.tavilyApiKey ?? process.env.TAVILY_API_KEY;
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
    }

    // =============================================================================
    // GoalPlanner Tools
    // =============================================================================

    case "listAllEvents": {
      if (!context.goalId) {
        return { success: false, error: "No goal ID provided" };
      }

      const events = await prisma.event.findMany({
        where: { goalId: context.goalId, userId },
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
    }

    case "listSuggestedEvents": {
      if (!context.goalId) {
        return { success: false, error: "No goal ID provided" };
      }

      const events = await prisma.event.findMany({
        where: { goalId: context.goalId, userId, confirmed: false },
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
    }

    case "modifySuggestedEvent": {
      const { eventId, title, start, end } = validated as {
        eventId: string;
        title?: string;
        start?: string;
        end?: string;
      };

      if (!context.goalId) {
        return { success: false, error: "No goal ID provided" };
      }

      // Verify the event exists and belongs to this goal
      const event = await prisma.event.findFirst({
        where: {
          id: eventId,
          goalId: context.goalId,
          userId,
          confirmed: false,
        },
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
    }

    case "deleteSuggestedEvent": {
      const { eventId } = validated as { eventId: string };

      if (!context.goalId) {
        return { success: false, error: "No goal ID provided" };
      }

      // Verify the event exists and belongs to this goal
      const event = await prisma.event.findFirst({
        where: {
          id: eventId,
          goalId: context.goalId,
          userId,
          confirmed: false,
        },
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
    }

    case "suggestEvents": {
      const { tasks } = validated as {
        tasks: Array<{ title: string; start: string; end: string }>;
      };

      if (!context.goalId) {
        return { success: false, error: "No goal ID provided" };
      }

      const goal = await prisma.goal.findFirst({
        where: { id: context.goalId, userId },
      });

      if (!goal) {
        return { success: false, error: "Goal not found" };
      }

      // Validate all dates first
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

      // Delete all existing events for this goal
      await prisma.event.deleteMany({ where: { goalId: context.goalId } });

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
            goalId: context.goalId,
            title: tasks[i].title,
            start: taskStart,
            end: taskEnd,
            kind: "task",
            minutesEstimate,
            order: i,
            completed: false,
            confirmed: false,
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
    }

    default:
      throw new Error(`Tool not implemented: ${toolName}`);
  }
}
