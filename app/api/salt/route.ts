import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const username = searchParams.get("username");

    if (!username) {
      return NextResponse.json(
        { error: "Username is required" },
        { status: 400 }
      );
    }

    // Fetch the salt for the user
    const userSalt = await prisma.userSalt.findUnique({
      where: {
        userId: username,
      },
    });

    if (!userSalt) {
      return NextResponse.json({ error: "Salt not found" }, { status: 404 });
    }

    return NextResponse.json(
      {
        salt: userSalt.salt,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching salt:", error);
    return NextResponse.json(
      { error: "Failed to fetch salt" },
      { status: 500 }
    );
  }
}
