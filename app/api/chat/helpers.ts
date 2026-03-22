import { tool } from "ai";
import type { UIMessage } from "ai";
import { z } from "zod";
import { RRule } from "rrule";
import { prisma } from "@/lib/prisma";
import type { Goal } from "@/lib/generated/prisma";

export function buildGoalTools(goalId: string, userId: string) {
  return {
    getEventsForDay: tool({
      description:
        "Get all calendar events for the user on a specific day, including occurrences of recurring ICS events. Use this to check for scheduling conflicts before proposing or saving tasks.",
      inputSchema: z.object({
        date: z
          .string()
          .describe("The date to query in YYYY-MM-DD format (e.g. 2026-03-22)"),
      }),
      execute: async ({ date }) => {
        const dayStart = new Date(`${date}T00:00:00.000Z`);
        const dayEnd = new Date(`${date}T23:59:59.999Z`);
        if (Number.isNaN(dayStart.getTime())) {
          return { error: "Invalid date format. Use YYYY-MM-DD." };
        }

        // Direct events: non-recurring events + stored modified occurrences
        const directEvents = await prisma.event.findMany({
          where: {
            userId,
            start: { gte: dayStart.toISOString(), lte: dayEnd.toISOString() },
          },
          select: {
            title: true,
            start: true,
            end: true,
            kind: true,
            uid: true,
            recurid: true,
          },
          orderBy: { start: "asc" },
        });

        // UIDs with a modified occurrence already captured above — skip their master expansion
        const modifiedUidsOnDay = new Set(
          directEvents
            .filter((e) => e.recurid !== "")
            .map((e) => e.uid)
            .filter(Boolean) as string[]
        );

        // All recurring ICS masters
        const recurringMasters = await prisma.event.findMany({
          where: {
            userId,
            recurid: "",
            recurrenceRule: { not: null },
          },
          select: {
            title: true,
            start: true,
            end: true,
            kind: true,
            uid: true,
            recurrenceRule: true,
            exdates: true,
          },
        });

        const recurringOccurrences: {
          title: string;
          start: string;
          end: string;
          kind: string | null;
        }[] = [];

        for (const master of recurringMasters) {
          if (!master.recurrenceRule) continue;
          if (master.uid && modifiedUidsOnDay.has(master.uid)) continue;

          try {
            const masterStart = new Date(master.start);
            const masterEnd = new Date(master.end);
            const durationMs = masterEnd.getTime() - masterStart.getTime();

            const rule = new RRule({
              ...RRule.parseString(master.recurrenceRule),
              dtstart: masterStart,
            });

            const exdateSet = new Set<string>();
            if (master.exdates) {
              try {
                for (const ex of JSON.parse(master.exdates) as string[]) {
                  exdateSet.add(new Date(ex).toISOString());
                }
              } catch {
                // ignore unparseable exdates
              }
            }

            for (const occ of rule.between(dayStart, dayEnd, true)) {
              if (exdateSet.has(occ.toISOString())) continue;
              recurringOccurrences.push({
                title: master.title,
                start: occ.toISOString(),
                end: new Date(occ.getTime() + durationMs).toISOString(),
                kind: master.kind,
              });
            }
          } catch {
            // skip masters with unparseable rrule
          }
        }

        const events = [
          ...directEvents.map((e) => ({
            title: e.title,
            start: e.start,
            end: e.end,
            kind: e.kind,
          })),
          ...recurringOccurrences,
        ].sort((a, b) => a.start.localeCompare(b.start));

        return { date, events };
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

Your job:
1. Before proposing tasks, call getEventsForDay for each day you plan to schedule on to check what's already there.
2. Propose 3-7 concrete, actionable tasks. For each task, assign a specific scheduled time period (start and end) spread across the days between now and the due date, avoiding conflicts with existing events.
3. Present the tasks in a clear list showing: task title, scheduled date, time range, and duration.
4. Call the saveTasks tool right away with the scheduled times so they appear on the calendar immediately.
5. After saving, show the user what was saved with times, and let them know they can adjust — if they request changes, update the tasks and call saveTasks again.

Guidelines:
- Keep task titles short and actionable.
- Schedule tasks during reasonable working hours (9am-6pm).
- Spread tasks across available days before the due date.
- Each task should be 15-120 minutes.
- Order tasks in the sequence they should be done.
- Be conversational and helpful. If the user wants to add, remove, reschedule, or modify tasks, accommodate them and call saveTasks again with the updated list.
- Always call saveTasks proactively — do not wait for explicit user approval on the first proposal.
- When scheduling, always avoid time slots already occupied by existing calendar events. If a day is heavily booked, move tasks to a less busy day or find gaps between existing events.`;
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
