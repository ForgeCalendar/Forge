import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { isValidProviderType } from "@/lib/ai-providers";
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
        include: { models: true },
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
