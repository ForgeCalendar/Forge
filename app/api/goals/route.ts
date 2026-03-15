import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiHandler } from "@/lib/api-handler";

interface InfoTagInput {
  title: string;
  info: string;
}

export const GET = apiHandler(async (userId) => {
  const goals = await prisma.goal.findMany({
    where: {
      userId,
    },
    include: {
      events: {
        orderBy: {
          order: "asc",
        },
      },
      infoTags: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return NextResponse.json(goals);
});

export const POST = apiHandler(async (userId, req) => {
  const body = await req.json();
  const { title, description, dueDate, infoTags } = body;

  const goal = await prisma.goal.create({
    data: {
      userId,
      title,
      description,
      dueDate,
      infoTags: {
        create:
          infoTags?.map((tag: InfoTagInput) => ({
            title: tag.title,
            info: tag.info,
          })) ?? [],
      },
    },
    include: {
      events: true,
      infoTags: true,
    },
  });

  return NextResponse.json(goal, { status: 201 });
});
