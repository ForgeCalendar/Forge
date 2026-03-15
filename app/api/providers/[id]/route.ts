import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiHandler } from "@/lib/api-handler";
import { isValidProviderType } from "@/lib/ai-providers";

type RouteContext = { params: Promise<{ id: string }> };

export const GET = apiHandler<RouteContext>(
  async (userId, _req, ctx): Promise<NextResponse> => {
    const { id } = await ctx.params;

    const provider = await prisma.provider.findFirst({
      where: { id, userId },
      include: { models: true },
    });

    if (!provider) {
      return NextResponse.json(
        { error: "Provider not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(provider);
  }
);

export const PUT = apiHandler<RouteContext>(
  async (userId, req, ctx): Promise<NextResponse> => {
    const { id } = await ctx.params;
    const body = await req.json();
    const { type, name, baseUrl, apiKey } = body;

    const existing = await prisma.provider.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Provider not found" },
        { status: 404 }
      );
    }

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

    const existing = await prisma.provider.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Provider not found" },
        { status: 404 }
      );
    }

    await prisma.provider.delete({ where: { id } });

    return NextResponse.json({ message: "Provider deleted successfully" });
  }
);
