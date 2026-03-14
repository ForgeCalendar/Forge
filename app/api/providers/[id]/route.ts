import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiHandler } from "@/lib/api-handler";
import { isValidProviderType } from "@/lib/ai-providers";
import { verifyOwnership } from "@/lib/verify-ownership";

type RouteContext = { params: Promise<{ id: string }> };

export const GET = apiHandler<RouteContext>(
  async (userId, _req, ctx): Promise<NextResponse> => {
    const { id } = await ctx.params;

    const provider = await verifyOwnership(
      prisma.provider.findFirst({ where: { id, userId }, include: { models: true } }),
      "Provider not found"
    );
    if (provider instanceof NextResponse) return provider;

    return NextResponse.json(provider);
  }
);

export const PUT = apiHandler<RouteContext>(
  async (userId, req, ctx): Promise<NextResponse> => {
    const { id } = await ctx.params;
    const body = await req.json();
    const { type, name, baseUrl, apiKey } = body;

    const existing = await verifyOwnership(
      prisma.provider.findFirst({ where: { id, userId } }),
      "Provider not found"
    );
    if (existing instanceof NextResponse) return existing;

    if (type !== undefined && !isValidProviderType(type)) {
      return NextResponse.json(
        {
          error: `Invalid provider type. Must be one of: ${[
            "anthropic",
            "openai",
            "google",
            "mistral",
            "openai-compatible",
          ].join(", ")}`,
        },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (type !== undefined) updateData.type = type;
    if (name !== undefined) updateData.name = name;
    if (baseUrl !== undefined) updateData.baseUrl = baseUrl || null;
    if (apiKey !== undefined) updateData.apiKey = apiKey;

    const updated = await prisma.provider.update({
      where: { id },
      data: updateData,
      include: { models: true },
    });

    return NextResponse.json(updated);
  }
);

export const DELETE = apiHandler<RouteContext>(
  async (userId, _req, ctx): Promise<NextResponse> => {
    const { id } = await ctx.params;

    const existing = await verifyOwnership(
      prisma.provider.findFirst({ where: { id, userId } }),
      "Provider not found"
    );
    if (existing instanceof NextResponse) return existing;

    await prisma.provider.delete({ where: { id } });

    return NextResponse.json({ message: "Provider deleted successfully" });
  }
);
