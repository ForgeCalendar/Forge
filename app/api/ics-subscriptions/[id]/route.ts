import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiHandler } from "@/lib/api-handler";

type RouteContext = { params: Promise<{ id: string }> };

export const GET = apiHandler<RouteContext>(async (userId, _req, ctx) => {
  const { id } = await ctx.params;

  const subscription = await prisma.icsSubscription.findFirst({
    where: {
      id,
      userId,
    },
  });

  if (!subscription) {
    return NextResponse.json(
      { error: "Subscription not found" },
      { status: 404 }
    );
  }

  return NextResponse.json(subscription);
});

export const PUT = apiHandler<RouteContext>(async (userId, req, ctx) => {
  const { id } = await ctx.params;
  const body = await req.json();
  const { name, url } = body;

  const existing = await prisma.icsSubscription.findFirst({
    where: { id, userId },
  });

  if (!existing) {
    return NextResponse.json(
      { error: "Subscription not found" },
      { status: 404 }
    );
  }

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
});

export const DELETE = apiHandler<RouteContext>(async (userId, _req, ctx) => {
  const { id } = await ctx.params;

  const existing = await prisma.icsSubscription.findFirst({
    where: { id, userId },
  });

  if (!existing) {
    return NextResponse.json(
      { error: "Subscription not found" },
      { status: 404 }
    );
  }

  await prisma.icsSubscription.delete({
    where: { id },
  });

  return NextResponse.json({ message: "Subscription deleted successfully" });
});
