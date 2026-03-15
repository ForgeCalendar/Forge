import { convertToModelMessages, streamText } from "ai";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiHandler } from "@/lib/api-handler";
import { createLanguageModel } from "@/lib/ai-providers";
import { verifyOwnership } from "@/lib/verify-ownership";
import {
  buildGoalTools,
  buildGoalSystemPrompt,
  saveChatHistory,
} from "./helpers";

export const maxDuration = 30;

export const POST = apiHandler(async (userId, req) => {
  const url = new URL(req.url);
  const providerId = url.searchParams.get("providerId");
  const modelId = url.searchParams.get("modelId");

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

  const goalId = url.searchParams.get("goalId");
  const { messages } = await req.json();

  const model = createLanguageModel(provider, modelId);
  const tools = goalId ? buildGoalTools(goalId, userId) : undefined;

  let system: string | undefined;
  if (goalId) {
    const goal = await prisma.goal.findFirst({
      where: { id: goalId, userId },
    });
    if (goal) {
      system = buildGoalSystemPrompt(goal);
    }
  }

  const result = streamText({
    model,
    messages: await convertToModelMessages(messages),
    ...(system ? { system } : {}),
    ...(tools ? { tools, maxSteps: 10 } : {}),
  });

  return result.toUIMessageStreamResponse({
    originalMessages: messages,
    onFinish: async ({ messages: allMessages }) => {
      if (goalId) {
        await saveChatHistory(
          goalId,
          userId,
          provider.id,
          modelId,
          allMessages
        );
      }
    },
  });
});
