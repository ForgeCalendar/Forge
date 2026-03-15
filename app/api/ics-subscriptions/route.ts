import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiHandler } from "@/lib/api-handler";

export const GET = apiHandler(async (userId) => {
  const subscriptions = await prisma.icsSubscription.findMany({
    where: {
      userId,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return NextResponse.json(subscriptions);
});

export const POST = apiHandler(async (userId, req) => {
  const body = await req.json();
  const { name, url } = body;

  if (!name || !url) {
    return NextResponse.json(
      { error: "Name and url are required" },
      { status: 400 }
    );
  }

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return NextResponse.json(
        { error: "Only http and https URLs are allowed" },
        { status: 400 }
      );
    }
  } catch {
    return NextResponse.json({ error: "Invalid URL format" }, { status: 400 });
  }

  const subscription = await prisma.icsSubscription.create({
    data: {
      userId,
      name,
      url,
    },
  });

  return NextResponse.json(subscription, { status: 201 });
});
