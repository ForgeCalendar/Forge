/**
 * Shared tool schemas for both client-side and server-side tool definitions.
 * These schemas define the input validation and metadata for all available tools.
 */

import { z } from "zod";

export const toolSchemas = {
  // =============================================================================
  // Base Tools - Available to all agents
  // =============================================================================

  saveMemory: {
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
  },

  readMemories: {
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
  },

  listMemoryQuestions: {
    description:
      "IMPORTANT: This tool does not send any visible response to the user. You MUST include a text message when calling this tool. List all stored memory questions (keys) about the user, without their answers. Use this at the start of a conversation to quickly see what you already know about the user, then selectively fetch specific answers with searchMemoryAnswer.",
    inputSchema: z.object({}).describe("No parameters required"),
  },

  searchMemoryAnswer: {
    description:
      "IMPORTANT: This tool does not send any visible response to the user. You MUST include a text message that incorporates what you learned naturally into your response. Look up the stored answer for a specific memory question. Use this after calling listMemoryQuestions to retrieve the answer for a question that is relevant to the current conversation.",
    inputSchema: z.object({
      question: z
        .string()
        .describe(
          "The exact question string to look up, as returned by listMemoryQuestions"
        ),
    }),
  },

  setChatTitle: {
    description:
      "Update the title of the current chat session. Use this to give the conversation a meaningful name based on what was discussed.",
    inputSchema: z.object({
      title: z
        .string()
        .min(1)
        .max(100)
        .describe("New title for the chat session"),
    }),
  },

  searchOnline: {
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
  },

  // =============================================================================
  // GoalPlanner Tools - Available only to GoalPlanner agent
  // =============================================================================

  listAllEvents: {
    description:
      "List all events related to this goal, including both confirmed and unconfirmed events. Use this to see the complete picture of what tasks exist for this goal.",
    inputSchema: z.object({}).describe("No parameters required"),
  },

  listSuggestedEvents: {
    description:
      "List all suggested (unconfirmed) events for this goal. Use this to see what events have been proposed but not yet confirmed by the user.",
    inputSchema: z.object({}).describe("No parameters required"),
  },

  modifySuggestedEvent: {
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
  },

  deleteSuggestedEvent: {
    description:
      "Delete a specific suggested event. Use this to remove an unconfirmed event that is no longer needed. Only works for events with confirmed: false.",
    inputSchema: z.object({
      eventId: z.string().describe("The ID of the event to delete"),
    }),
  },

  suggestEvents: {
    description:
      "Suggest events for the goal as calendar events. Each event must have a scheduled start and end time (ISO 8601). Call this proactively after proposing tasks.",
    inputSchema: z.object({
      tasks: z
        .array(
          z.object({
            title: z.string().describe("Short, actionable task title"),
            start: z.string().describe("ISO 8601 start datetime for this task"),
            end: z.string().describe("ISO 8601 end datetime for this task"),
          })
        )
        .min(1),
    }),
  },
} as const;

export type ToolName = keyof typeof toolSchemas;

/**
 * Get the list of tools available for a specific role.
 */
export function getToolsForRole(
  role: "Assistant" | "GoalPlanner" | "TaskHelper"
): ToolName[] {
  const baseTools: ToolName[] = [
    "saveMemory",
    "readMemories",
    "listMemoryQuestions",
    "searchMemoryAnswer",
    "setChatTitle",
    "searchOnline",
  ];

  switch (role) {
    case "GoalPlanner":
      return [
        ...baseTools,
        "listAllEvents",
        "listSuggestedEvents",
        "modifySuggestedEvent",
        "deleteSuggestedEvent",
        "suggestEvents",
      ];
    case "Assistant":
    case "TaskHelper":
    default:
      return baseTools;
  }
}
