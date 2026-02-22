import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

// GET /api/ics-subscriptions - Get all ICS subscriptions for the authenticated user
export async function GET() {
  try {
    const userId = await requireAuth();

    const subscriptions = await prisma.icsSubscription.findMany({
      where: {
        userId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(subscriptions);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }
    console.error("Error fetching ICS subscriptions:", error);
    return NextResponse.json(
      { error: "Failed to fetch ICS subscriptions" },
      { status: 500 },
    );
  }
}

// POST /api/ics-subscriptions - Create a new ICS subscription
export async function POST(req: Request) {
  try {
    const userId = await requireAuth();
    const body = await req.json();
    const { name, url } = body;

    // Validate required fields
    if (!name || !url) {
      return NextResponse.json(
        { error: "Name and url are required" },
        { status: 400 },
      );
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { error: "Invalid URL format" },
        { status: 400 },
      );
    }

    const subscription = await prisma.icsSubscription.create({
      data: {
        userId,
        name,
        url,
      },
    });

    return NextResponse.json(subscription, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }
    console.error("Error creating ICS subscription:", error);
    return NextResponse.json(
      { error: "Failed to create ICS subscription" },
      { status: 500 },
    );
  }
}
