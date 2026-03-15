import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiHandler } from "@/lib/api-handler";

type RouteContext = { params: Promise<{ id: string; modelId: string }> };

export const PUT = apiHandler<RouteContext>(
  async (userId, req, ctx): Promise<NextResponse> => {
    const { id, modelId } = await ctx.params;
    const body = await req.json();

    const provider = await prisma.provider.findFirst({
      where: { id, userId },
    });

    if (!provider) {
      return NextResponse.json(
        { error: "Provider not found" },
        { status: 404 }
      );
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
  }
);

export const DELETE = apiHandler<RouteContext>(
  async (userId, _req, ctx): Promise<NextResponse> => {
    const { id, modelId } = await ctx.params;

    const provider = await prisma.provider.findFirst({
      where: { id, userId },
    });

    if (!provider) {
      return NextResponse.json(
        { error: "Provider not found" },
        { status: 404 }
      );
    }

    const existing = await prisma.aIModel.findFirst({
      where: { id: modelId, providerId: id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Model not found" }, { status: 404 });
    }

    await prisma.aIModel.delete({ where: { id: modelId } });

    return NextResponse.json({ message: "Model deleted successfully" });
  }
);
