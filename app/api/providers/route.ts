import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiHandler } from "@/lib/api-handler";
import {
  isValidProviderType,
  KNOWN_MODELS,
  type ProviderType,
} from "@/lib/ai-providers";

export const GET = apiHandler(async (userId): Promise<NextResponse> => {
  const providers = await prisma.provider.findMany({
    where: { userId },
    include: { models: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(providers);
});

export const POST = apiHandler(async (userId, req): Promise<NextResponse> => {
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
});
