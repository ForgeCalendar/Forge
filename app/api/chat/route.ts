import { convertToModelMessages, streamText } from "ai";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { createLanguageModel } from "@/lib/ai-providers";
import { verifyOwnership } from "@/lib/verify-ownership";
import {
  buildGoalTools,
  buildGoalSystemPrompt,
  saveChatHistory,
} from "./helpers";

export const maxDuration = 30;

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

    const { messages } = await req.json();

    // Look up the goal from chatHistoryId if provided
    let goal = null;
    if (chatHistoryId) {
      goal = await prisma.goal.findFirst({
        where: { chatHistoryId, userId },
      });
    }

    const model = createLanguageModel(provider, modelId);
    const tools = goal ? buildGoalTools(goal.id, userId) : undefined;
    const system = goal ? buildGoalSystemPrompt(goal) : undefined;

    const result = streamText({
      model,
      messages: await convertToModelMessages(messages),
      ...(system ? { system } : {}),
      ...(tools ? { tools, maxSteps: 10 } : {}),
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
