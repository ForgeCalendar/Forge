/**
 * Chat history messages API endpoint.
 * Allows client-side chat to save messages to the database.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  try {
    // 1. Authenticate user
    const userId = await requireAuth();

    // 2. Get chat history ID from route params
    const { id: chatHistoryId } = await context.params;

    // 3. Verify ownership
    const chatHistory = await prisma.chatHistory.findUnique({
      where: { id: chatHistoryId },
      select: { userId: true },
    });

    if (!chatHistory) {
      return NextResponse.json(
        { error: "Chat history not found" },
        { status: 404 }
      );
    }

    if (chatHistory.userId !== userId) {
      return NextResponse.json(
        { error: "Unauthorized - chat history belongs to another user" },
        { status: 403 }
      );
    }

    // 4. Parse request body
    const body = await request.json();
    const { messages, providerId, modelId } = body;

    if (!Array.isArray(messages)) {
      return NextResponse.json(
        { error: "Messages must be an array" },
        { status: 400 }
      );
    }

    // 5. Save messages to database
    await prisma.$transaction(async (tx) => {
      // Update provider/model info if provided
      if (providerId && modelId) {
        await tx.chatHistory.update({
          where: { id: chatHistoryId },
          data: { providerId, modelId },
        });
      }

      // Replace all messages
      await tx.message.deleteMany({
        where: { chatHistoryId },
      });

      if (messages.length > 0) {
        await tx.message.createMany({
          data: messages.map((msg: any, idx: number) => ({
            chatHistoryId,
            role: msg.role ?? "user",
            content: JSON.stringify(msg),
            order: idx,
          })),
        });
      }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error saving chat history messages:", error);
    return NextResponse.json(
      {
        error: "Failed to save messages",
        message: error.message,
      },
      { status: 500 }
    );
  }
}
