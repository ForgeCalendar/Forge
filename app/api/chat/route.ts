import { convertToModelMessages, streamText, type StepResult } from "ai";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { createLanguageModel } from "@/lib/ai-providers";
import { verifyOwnership } from "@/lib/verify-ownership";
import { buildTools, buildSystemPrompt, saveChatHistory } from "./helpers";

export const maxDuration = 120;

// Custom stop condition: stop when the last step has no tool calls
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function hasNoToolCall() {
  return ({ steps }: { steps: Array<StepResult<any>> }) => {
    if (steps.length === 0) return false;
    const lastStep = steps[steps.length - 1];
    return lastStep.toolCalls.length === 0;
  };
}

export async function POST(req: Request): Promise<NextResponse | Response> {
  try {
    const userId = await requireAuth();

    const url = new URL(req.url);
    const providerId = url.searchParams.get("providerId");
    const modelId = url.searchParams.get("modelId");
    const chatHistoryId = url.searchParams.get("chatHistoryId");

    if (!providerId || !modelId) {
      return NextResponse.json(
        { error: "providerId and modelId parameters are required" },
        { status: 400 }
      );
    }

    const provider = await verifyOwnership(
      prisma.provider.findFirst({ where: { id: providerId, userId } }),
      "Provider not found. Please configure one in settings."
    );
    if (provider instanceof NextResponse) return provider;

    // Fetch user's timezone
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { timezone: true },
    });
    const timezone = user?.timezone || "UTC";

    const { messages } = await req.json();

    // Look up the chat history and its role
    const chatHistory = chatHistoryId
      ? await prisma.chatHistory.findFirst({
          where: { id: chatHistoryId, userId },
          include: { goal: true, event: true },
        })
      : null;

    const model = createLanguageModel(provider, modelId);

    // Build tools and system prompt based on role
    let tools = undefined;
    let system = undefined;

    if (chatHistory?.role) {
      tools = buildTools({
        chatHistoryId: chatHistory.id,
        userId,
        role: chatHistory.role,
        goalId: chatHistory.goal?.id,
      });

      system = buildSystemPrompt({
        role: chatHistory.role,
        goal: chatHistory.goal ?? undefined,
        eventTitle: chatHistory.event?.title,
        timezone,
      });
    }

    const result = streamText({
      model,
      messages: await convertToModelMessages(messages),
      ...(system ? { system } : {}),
      ...(tools ? { tools, maxSteps: 10, stopWhen: hasNoToolCall() } : {}),
      ...(provider.type === "anthropic"
        ? {
            providerOptions: {
              anthropic: {
                thinking: { type: "enabled", budgetTokens: 10000 },
              },
            },
          }
        : {}),
    });

    return result.toUIMessageStreamResponse({
      originalMessages: messages,
      onFinish: async ({ messages: allMessages }) => {
        if (chatHistoryId) {
          await saveChatHistory(
            chatHistoryId,
            userId,
            provider.id,
            modelId,
            allMessages
          );
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
    console.error("Error in chat:", error);
    return NextResponse.json(
      { error: "Failed to process chat request" },
      { status: 500 }
    );
  }
}
