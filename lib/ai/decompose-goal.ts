import { createAnthropic } from "@ai-sdk/anthropic";
import { generateObject } from "ai";
import { z } from "zod";

const taskSchema = z.object({
  title: z.string().describe("Short, actionable task title"),
  minutesEstimate: z
    .number()
    .int()
    .positive()
    .describe("Estimated minutes to complete this task"),
});

const goalDecompositionSchema = z.object({
  tasks: z
    .array(taskSchema)
    .min(1)
    .max(10)
    .describe("Ordered list of tasks to accomplish the goal"),
});

export type DecomposedTask = {
  title: string;
  minutesEstimate: number;
};

export async function decomposeGoal(options: {
  apiKey: string;
  goalTitle: string;
  goalDescription: string;
  dueDate: string | null;
}): Promise<DecomposedTask[]> {
  const { apiKey, goalTitle, goalDescription, dueDate } = options;

  const anthropic = createAnthropic({ apiKey });

  const dueDateContext = dueDate
    ? `The goal is due on ${dueDate}.`
    : "There is no specific due date.";

  const result = await generateObject({
    model: anthropic("claude-sonnet-4-5-20250929"),
    schema: goalDecompositionSchema,
    schemaName: "GoalDecomposition",
    schemaDescription:
      "A decomposition of a goal into ordered, actionable tasks",
    prompt: `Decompose the following goal into concrete, actionable tasks. Each task should be a single work session. Return 3-7 tasks ordered by the sequence they should be done.

Goal: ${goalTitle}
Description: ${goalDescription}
${dueDateContext}`,
  });

  return result.object.tasks;
}
