import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

// GET /api/ics-subscriptions/:id - Get a specific ICS subscription
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await requireAuth();
    const { id } = await params;

    const subscription = await prisma.icsSubscription.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!subscription) {
      return NextResponse.json(
        { error: "Subscription not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(subscription);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }
    console.error("Error fetching ICS subscription:", error);
    return NextResponse.json(
      { error: "Failed to fetch ICS subscription" },
      { status: 500 },
    );
  }
}

// PUT /api/ics-subscriptions/:id - Update an ICS subscription
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await requireAuth();
    const { id } = await params;
    const body = await req.json();
    const { name, url } = body;

    const existing = await prisma.icsSubscription.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Subscription not found" },
        { status: 404 },
      );
    }

    if (url !== undefined) {
      try {
        new URL(url);
      } catch {
        return NextResponse.json(
          { error: "Invalid URL format" },
          { status: 400 },
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
        { status: 401 },
      );
    }
    console.error("Error updating ICS subscription:", error);
    return NextResponse.json(
      { error: "Failed to update ICS subscription" },
      { status: 500 },
    );
  }
}

// DELETE /api/ics-subscriptions/:id - Delete an ICS subscription
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await requireAuth();
    const { id } = await params;

    const existing = await prisma.icsSubscription.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Subscription not found" },
        { status: 404 },
      );
    }

    await prisma.icsSubscription.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Subscription deleted successfully" });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }
    console.error("Error deleting ICS subscription:", error);
    return NextResponse.json(
      { error: "Failed to delete ICS subscription" },
      { status: 500 },
    );
  }
}
