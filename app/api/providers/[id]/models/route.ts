import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const userId = await requireAuth();
    const { id } = await params;

    const provider = await prisma.provider.findFirst({
      where: { id, userId },
    });

    if (!provider) {
      return NextResponse.json({ error: "Provider not found" }, { status: 404 });
    }

    const models = await prisma.aIModel.findMany({
      where: { providerId: id },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(models);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }
    console.error("Error fetching models:", error);
    return NextResponse.json(
      { error: "Failed to fetch models" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const userId = await requireAuth();
    const { id } = await params;
    const body = await req.json();
    const { modelId, name, isDefault } = body;

    if (!modelId || !name) {
      return NextResponse.json(
        { error: "modelId and name are required" },
        { status: 400 }
      );
    }

    const provider = await prisma.provider.findFirst({
      where: { id, userId },
    });

    if (!provider) {
      return NextResponse.json({ error: "Provider not found" }, { status: 404 });
    }

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
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }
    console.error("Error creating model:", error);
    return NextResponse.json(
      { error: "Failed to create model" },
      { status: 500 }
    );
  }
}
