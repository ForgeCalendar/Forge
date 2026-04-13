import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(
  _req: Request,
  ctx: RouteContext
): Promise<NextResponse> {
  try {
    const userId = await requireAuth();
    const { id } = await ctx.params;

    const chatHistory = await prisma.chatHistory.findFirst({
      where: { id, userId },
      select: {
        id: true,
        title: true,
        role: true,
        providerId: true,
        modelId: true,
        messages: { orderBy: { order: "asc" } },
        goal: { select: { id: true } },
        event: { select: { id: true, title: true } },
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
      title: chatHistory.title,
      role: chatHistory.role,
      providerId: chatHistory.providerId,
      modelId: chatHistory.modelId,
      messages,
      goalId: chatHistory.goal?.id,
      eventId: chatHistory.event?.id,
      eventTitle: chatHistory.event?.title,
    });
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

export async function DELETE(
  _req: Request,
  ctx: RouteContext
): Promise<NextResponse> {
  try {
    const userId = await requireAuth();
    const { id } = await ctx.params;

    const chatHistory = await prisma.chatHistory.findFirst({
      where: { id, userId },
      select: { id: true },
    });

    if (!chatHistory) {
      return NextResponse.json(
        { error: "Chat history not found" },
        { status: 404 }
      );
    }

    await prisma.chatHistory.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }
    console.error("Error deleting chat history:", error);
    return NextResponse.json(
      { error: "Failed to delete chat history" },
      { status: 500 }
    );
  }
}
