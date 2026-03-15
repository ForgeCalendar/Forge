import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiHandler } from "@/lib/api-handler";
import { verifyOwnership } from "@/lib/verify-ownership";

type RouteContext = { params: Promise<{ id: string; modelId: string }> };

export const PUT = apiHandler<RouteContext>(
  async (userId, req, ctx): Promise<NextResponse> => {
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
  }
);

export const DELETE = apiHandler<RouteContext>(
  async (userId, _req, ctx): Promise<NextResponse> => {
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
  }
);
