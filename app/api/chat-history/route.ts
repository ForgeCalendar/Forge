import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function GET(): Promise<NextResponse> {
  try {
    const userId = await requireAuth();

    const chatHistories = await prisma.chatHistory.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(chatHistories);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }
    console.error("Error fetching chat histories:", error);
    return NextResponse.json(
      { error: "Failed to fetch chat histories" },
      { status: 500 }
    );
  }
}

export async function POST(): Promise<NextResponse> {
  try {
    const userId = await requireAuth();

    const now = new Date();
    const title = `Chat ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`;

    const chatHistory = await prisma.chatHistory.create({
      data: {
        userId,
        title,
        role: "Assistant",
      },
      select: {
        id: true,
        title: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(chatHistory, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }
    console.error("Error creating chat history:", error);
    return NextResponse.json(
      { error: "Failed to create chat history" },
      { status: 500 }
    );
  }
}
