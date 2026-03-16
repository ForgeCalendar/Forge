import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { verifyOwnership } from "@/lib/verify-ownership";

type RouteContext = { params: Promise<{ id: string; modelId: string }> };

export async function PUT(
  req: Request,
  ctx: RouteContext
): Promise<NextResponse> {
  try {
    const userId = await requireAuth();
    const { id, modelId } = await ctx.params;
    const body = await req.json();

    const provider = await verifyOwnership(
      prisma.provider.findFirst({ where: { id, userId } }),
      "Provider not found"
    );
    if (provider instanceof NextResponse) return provider;

    const existing = await verifyOwnership(
      prisma.aIModel.findFirst({ where: { id: modelId, providerId: id } }),
      "Model not found"
    );
    if (existing instanceof NextResponse) return existing;

    if (body.isDefault) {
      await prisma.aIModel.updateMany({
        where: { providerId: id },
        data: { isDefault: false },
      });
    }

    const updateData: Record<string, unknown> = {};
    if (body.modelId !== undefined) updateData.modelId = body.modelId;
    if (body.name !== undefined) updateData.name = body.name;
    if (body.isDefault !== undefined) updateData.isDefault = body.isDefault;

    const updated = await prisma.aIModel.update({
      where: { id: modelId },
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
    console.error("Error updating model:", error);
    return NextResponse.json(
      { error: "Failed to update model" },
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
    const { id, modelId } = await ctx.params;

    const provider = await verifyOwnership(
      prisma.provider.findFirst({ where: { id, userId } }),
      "Provider not found"
    );
    if (provider instanceof NextResponse) return provider;

    const existing = await verifyOwnership(
      prisma.aIModel.findFirst({ where: { id: modelId, providerId: id } }),
      "Model not found"
    );
    if (existing instanceof NextResponse) return existing;

    await prisma.aIModel.delete({ where: { id: modelId } });

    return NextResponse.json({ message: "Model deleted successfully" });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }
    console.error("Error deleting model:", error);
    return NextResponse.json(
      { error: "Failed to delete model" },
      { status: 500 }
    );
  }
}
