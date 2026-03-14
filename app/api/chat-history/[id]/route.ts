import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiHandler } from "@/lib/api-handler";

type RouteContext = { params: Promise<{ id: string }> };

export const GET = apiHandler<RouteContext>(
  async (userId, _req, ctx): Promise<NextResponse> => {
    const { id } = await ctx.params;

    const chatHistory = await prisma.chatHistory.findFirst({
      where: { id, userId },
      select: {
        id: true,
        providerId: true,
        modelId: true,
        messages: { orderBy: { order: "asc" } },
      },
    });

    if (!chatHistory) {
      return NextResponse.json(
        { error: "Chat history not found" },
        { status: 404 }
      );
    }

    const messages = chatHistory.messages.map((msg) => {
      try {
        return JSON.parse(msg.content);
      } catch {
        return { id: msg.id, role: msg.role, content: msg.content };
      }
    });

    return NextResponse.json({
      id: chatHistory.id,
      providerId: chatHistory.providerId,
      modelId: chatHistory.modelId,
      messages,
    });
  }
);
