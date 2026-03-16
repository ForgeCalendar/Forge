import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { verifyOwnership } from "@/lib/verify-ownership";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(
  _req: Request,
  ctx: RouteContext
): Promise<NextResponse> {
  try {
    const userId = await requireAuth();
    const { id } = await ctx.params;

    const subscription = await verifyOwnership(
      prisma.icsSubscription.findFirst({ where: { id, userId } }),
      "Subscription not found"
    );
    if (subscription instanceof NextResponse) return subscription;

    return NextResponse.json(subscription);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }
    console.error("Error fetching ICS subscription:", error);
    return NextResponse.json(
      { error: "Failed to fetch ICS subscription" },
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
    const { name, url } = body;

    const existing = await verifyOwnership(
      prisma.icsSubscription.findFirst({ where: { id, userId } }),
      "Subscription not found"
    );
    if (existing instanceof NextResponse) return existing;

    if (url !== undefined) {
      try {
        const parsed = new URL(url);
        if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
          return NextResponse.json(
            { error: "Only http and https URLs are allowed" },
            { status: 400 }
          );
        }
      } catch {
        return NextResponse.json(
          { error: "Invalid URL format" },
          { status: 400 }
        );
      }
    }

    const updateData: { name?: string; url?: string } = {};
    if (name !== undefined) updateData.name = name;
    if (url !== undefined) updateData.url = url;

    const updated = await prisma.icsSubscription.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }
    console.error("Error updating ICS subscription:", error);
    return NextResponse.json(
      { error: "Failed to update ICS subscription" },
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
      prisma.icsSubscription.findFirst({ where: { id, userId } }),
      "Subscription not found"
    );
    if (existing instanceof NextResponse) return existing;

    await prisma.icsSubscription.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Subscription deleted successfully" });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }
    console.error("Error deleting ICS subscription:", error);
    return NextResponse.json(
      { error: "Failed to delete ICS subscription" },
      { status: 500 }
    );
  }
}
