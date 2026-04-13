import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function GET(): Promise<NextResponse> {
  try {
    const userId = await requireAuth();

    const providers = await prisma.provider.findMany({
      where: { userId },
      select: {
        id: true,
        encryptedData: true,
        createdAt: true,
        updatedAt: true,
      },
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
    const { encryptedData } = body;

    if (!encryptedData) {
      return NextResponse.json(
        { error: "encryptedData is required" },
        { status: 400 }
      );
    }

    // Server stores the encrypted blob without knowing its contents
    const provider = await prisma.provider.create({
      data: {
        userId,
        encryptedData,
      },
    });

    return NextResponse.json({ id: provider.id }, { status: 201 });
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
