import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string; modelId: string }> }
): Promise<NextResponse> {
  try {
    const userId = await requireAuth();
    const { id, modelId } = await params;
    const body = await req.json();

    const provider = await prisma.provider.findFirst({
      where: { id, userId },
    });

    if (!provider) {
      return NextResponse.json({ error: "Provider not found" }, { status: 404 });
    }

    const existing = await prisma.aIModel.findFirst({
      where: { id: modelId, providerId: id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Model not found" }, { status: 404 });
    }

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
  { params }: { params: Promise<{ id: string; modelId: string }> }
): Promise<NextResponse> {
  try {
    const userId = await requireAuth();
    const { id, modelId } = await params;

    const provider = await prisma.provider.findFirst({
      where: { id, userId },
    });

    if (!provider) {
      return NextResponse.json({ error: "Provider not found" }, { status: 404 });
    }

    const existing = await prisma.aIModel.findFirst({
      where: { id: modelId, providerId: id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Model not found" }, { status: 404 });
    }

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
