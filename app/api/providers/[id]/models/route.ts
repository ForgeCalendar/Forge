import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiHandler } from "@/lib/api-handler";
import { verifyOwnership } from "@/lib/verify-ownership";

type RouteContext = { params: Promise<{ id: string }> };

export const GET = apiHandler<RouteContext>(
  async (userId, _req, ctx): Promise<NextResponse> => {
    const { id } = await ctx.params;

    const provider = await verifyOwnership(
      prisma.provider.findFirst({ where: { id, userId } }),
      "Provider not found"
    );
    if (provider instanceof NextResponse) return provider;

    const models = await prisma.aIModel.findMany({
      where: { providerId: id },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(models);
  }
);

export const POST = apiHandler<RouteContext>(
  async (userId, req, ctx): Promise<NextResponse> => {
    const { id } = await ctx.params;
    const body = await req.json();
    const { modelId, name, isDefault } = body;

    if (!modelId || !name) {
      return NextResponse.json(
        { error: "modelId and name are required" },
        { status: 400 }
      );
    }

    const provider = await verifyOwnership(
      prisma.provider.findFirst({ where: { id, userId } }),
      "Provider not found"
    );
    if (provider instanceof NextResponse) return provider;

    if (isDefault) {
      await prisma.aIModel.updateMany({
        where: { providerId: id },
        data: { isDefault: false },
      });
    }

    const model = await prisma.aIModel.create({
      data: {
        providerId: id,
        modelId,
        name,
        isDefault: isDefault ?? false,
      },
    });

    return NextResponse.json(model, { status: 201 });
  }
);
