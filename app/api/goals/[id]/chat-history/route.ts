import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireAuth();
    const { id } = await params;

    const goal = await prisma.goal.findFirst({
      where: { id, userId },
      select: {
        chatHistoryId: true,
        chatHistory: {
          select: {
            messages: {
              orderBy: { order: "asc" },
            },
          },
        },
      },
    });

    if (!goal) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 });
    }

    const messages = (goal.chatHistory?.messages ?? []).map((msg) => {
      try {
        return JSON.parse(msg.content);
      } catch {
        return { id: msg.id, role: msg.role, content: msg.content };
      }
    });

    return NextResponse.json({ messages });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }
    console.error("Error fetching chat history:", error);
    return NextResponse.json(
      { error: "Failed to fetch chat history" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireAuth();
    const { id } = await params;
    const { messages } = await req.json();

    const goal = await prisma.goal.findFirst({
      where: { id, userId },
      select: { chatHistoryId: true },
    });

    if (!goal) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 });
    }

    if (goal.chatHistoryId) {
      await prisma.message.deleteMany({
        where: { chatHistoryId: goal.chatHistoryId },
      });

      if (Array.isArray(messages) && messages.length > 0) {
        await prisma.message.createMany({
          data: messages.map(
            (msg: { id?: string; role?: string; createdAt?: string }, idx: number) => ({
              chatHistoryId: goal.chatHistoryId!,
              role: msg.role ?? "user",
              content: JSON.stringify(msg),
              order: idx,
              createdAt: msg.createdAt ? new Date(msg.createdAt) : undefined,
            })
          ),
        });
      }
    } else {
      const apiKeyRecord = await prisma.aIAgentApiKey.findFirst({
        where: { userId, provider: "ANTHROPIC" },
        select: { id: true },
      });

      const chatHistory = await prisma.chatHistory.create({
        data: {
          userId,
          apiKeyId: apiKeyRecord?.id ?? null,
          messages: {
            create: Array.isArray(messages)
              ? messages.map(
                  (msg: { id?: string; role?: string; createdAt?: string }, idx: number) => ({
                    role: msg.role ?? "user",
                    content: JSON.stringify(msg),
                    order: idx,
                    createdAt: msg.createdAt
                      ? new Date(msg.createdAt)
                      : undefined,
                  })
                )
              : [],
          },
        },
      });

      await prisma.goal.update({
        where: { id },
        data: { chatHistoryId: chatHistory.id },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }
    console.error("Error saving chat history:", error);
    return NextResponse.json(
      { error: "Failed to save chat history" },
      { status: 500 }
    );
  }
}
