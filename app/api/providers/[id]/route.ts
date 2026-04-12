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

    const provider = await verifyOwnership(
      prisma.provider.findFirst({
        where: { id, userId },
        select: {
          id: true,
          encryptedData: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      "Provider not found"
    );
    if (provider instanceof NextResponse) return provider;

    return NextResponse.json(provider);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }
    console.error("Error fetching provider:", error);
    return NextResponse.json(
      { error: "Failed to fetch provider" },
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
    const { encryptedData } = body;

    if (!encryptedData) {
      return NextResponse.json(
        { error: "encryptedData is required" },
        { status: 400 }
      );
    }

    const existing = await verifyOwnership(
      prisma.provider.findFirst({ where: { id, userId } }),
      "Provider not found"
    );
    if (existing instanceof NextResponse) return existing;

    const updated = await prisma.provider.update({
      where: { id },
      data: { encryptedData },
    });

    return NextResponse.json({ id: updated.id });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }
    console.error("Error updating provider:", error);
    return NextResponse.json(
      { error: "Failed to update provider" },
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
      prisma.provider.findFirst({ where: { id, userId } }),
      "Provider not found"
    );
    if (existing instanceof NextResponse) return existing;

    await prisma.provider.delete({ where: { id } });

    return NextResponse.json({ message: "Provider deleted successfully" });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }
    console.error("Error deleting provider:", error);
    return NextResponse.json(
      { error: "Failed to delete provider" },
      { status: 500 }
    );
  }
}
