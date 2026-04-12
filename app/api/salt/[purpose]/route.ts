import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { SaltPurpose } from "@/lib/generated/prisma";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ purpose: string }> }
) {
  try {
    const { purpose } = await params;

    // Validate purpose is a valid SaltPurpose enum value
    if (!Object.values(SaltPurpose).includes(purpose as SaltPurpose)) {
      return NextResponse.json({ error: "Invalid purpose" }, { status: 400 });
    }

    let username: string;

    // If purpose is "authentication", get username from search params
    // Otherwise, require authentication
    if (purpose === SaltPurpose.authentication) {
      const { searchParams } = new URL(req.url);
      const usernameParam = searchParams.get("username");

      if (!usernameParam) {
        return NextResponse.json(
          { error: "Username is required" },
          { status: 400 }
        );
      }

      username = usernameParam;
    } else {
      // For other purposes, require authentication
      try {
        username = await requireAuth();
      } catch (error) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    // Fetch the salt for the user and purpose
    const userSalt = await prisma.userSalt.findUnique({
      where: {
        userId_purpose: {
          userId: username,
          purpose: purpose as SaltPurpose,
        },
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
