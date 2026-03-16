import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import {
  isValidProviderType,
  KNOWN_MODELS,
  type ProviderType,
} from "@/lib/ai-providers";

export async function GET(): Promise<NextResponse> {
  try {
    const userId = await requireAuth();

    const providers = await prisma.provider.findMany({
      where: { userId },
      include: { models: true },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(providers);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }
    console.error("Error fetching providers:", error);
    return NextResponse.json(
      { error: "Failed to fetch providers" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request): Promise<NextResponse> {
  try {
    const userId = await requireAuth();
    const body = await req.json();
    const { type, name, baseUrl, apiKey } = body;

    if (!type || !apiKey || !name) {
      return NextResponse.json(
        { error: "type, name, and apiKey are required" },
        { status: 400 }
      );
    }

    if (!isValidProviderType(type)) {
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

    const provider = await prisma.provider.create({
      data: {
        userId,
        type,
        name,
        baseUrl: baseUrl || null,
        apiKey,
      },
    });

    const suggestions = KNOWN_MODELS[type as ProviderType] ?? [];
    if (suggestions.length > 0) {
      await prisma.aIModel.createMany({
        data: suggestions.map((m, idx) => ({
          providerId: provider.id,
          modelId: m.modelId,
          name: m.name,
          isDefault: idx === 0,
        })),
      });
    }

    const result = await prisma.provider.findUnique({
      where: { id: provider.id },
      include: { models: true },
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }
    console.error("Error creating provider:", error);
    return NextResponse.json(
      { error: "Failed to create provider" },
      { status: 500 }
    );
  }
}
