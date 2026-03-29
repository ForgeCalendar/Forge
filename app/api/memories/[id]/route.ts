import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { verifyOwnership } from "@/lib/verify-ownership";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(
  _req: Request,
  ctx: RouteContext
): Promise<NextResponse> {
  try {
    const userId = await requireAuth();
    const { id } = await ctx.params;

    const memory = await verifyOwnership(
      prisma.memory.findFirst({
        where: { id, userId },
      }),
      "Memory not found"
    );
    if (memory instanceof NextResponse) return memory;

    return NextResponse.json(memory);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }
    console.error("Error fetching memory:", error);
    return NextResponse.json(
      { error: "Failed to fetch memory" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: Request,
  ctx: RouteContext
): Promise<NextResponse> {
  try {
    const userId = await requireAuth();
    const { id } = await ctx.params;
    const body = await req.json();
    const { question, answer } = body;

    const existing = await verifyOwnership(
      prisma.memory.findFirst({ where: { id, userId } }),
      "Memory not found"
    );
    if (existing instanceof NextResponse) return existing;

    const updateData: Record<string, string> = {};
    if (question?.trim()) updateData.question = question.trim();
    if (answer?.trim()) updateData.answer = answer.trim();

    const updated = await prisma.memory.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }
    console.error("Error updating memory:", error);
    return NextResponse.json(
      { error: "Failed to update memory" },
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

    const existing = await verifyOwnership(
      prisma.memory.findFirst({ where: { id, userId } }),
      "Memory not found"
    );
    if (existing instanceof NextResponse) return existing;

    await prisma.memory.delete({ where: { id } });

    return NextResponse.json({ message: "Memory deleted successfully" });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }
    console.error("Error deleting memory:", error);
    return NextResponse.json(
      { error: "Failed to delete memory" },
      { status: 500 }
    );
  }
}
