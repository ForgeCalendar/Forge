import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

type SearchConfigRow = {
  tavilyApiKey: string | null;
};

export async function GET(): Promise<NextResponse> {
  try {
    const userId = await requireAuth();

    const rows = await prisma.$queryRaw<SearchConfigRow[]>`
      SELECT "tavilyApiKey"
      FROM "SearchConfig"
      WHERE "userId" = ${userId}
      LIMIT 1
    `;

    const config = rows[0];

    return NextResponse.json({
      hasTavilyApiKey: Boolean(config?.tavilyApiKey),
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }
    console.error("Error fetching search config:", error);
    return NextResponse.json(
      { error: "Failed to fetch search config" },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request): Promise<NextResponse> {
  try {
    const userId = await requireAuth();
    const body = await req.json();

    const existingRows = await prisma.$queryRaw<SearchConfigRow[]>`
      SELECT "tavilyApiKey"
      FROM "SearchConfig"
      WHERE "userId" = ${userId}
      LIMIT 1
    `;
    const existing = existingRows[0];

    const tavilyApiKeyProvided = typeof body.tavilyApiKey === "string";

    const tavilyApiKey = tavilyApiKeyProvided
      ? body.tavilyApiKey.trim()
      : (existing?.tavilyApiKey ?? "");

    if (!tavilyApiKey) {
      await prisma.$executeRaw`
        DELETE FROM "SearchConfig"
        WHERE "userId" = ${userId}
      `;

      return NextResponse.json({
        success: true,
        hasTavilyApiKey: false,
      });
    }

    await prisma.$executeRaw`
      INSERT INTO "SearchConfig" (
        "id",
        "userId",
        "tavilyApiKey",
        "createdAt",
        "updatedAt"
      )
      VALUES (
        lower(hex(randomblob(16))),
        ${userId},
        ${tavilyApiKey || null},
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      )
      ON CONFLICT("userId") DO UPDATE SET
        "tavilyApiKey" = excluded."tavilyApiKey",
        "updatedAt" = CURRENT_TIMESTAMP
    `;

    return NextResponse.json({
      success: true,
      hasTavilyApiKey: Boolean(tavilyApiKey),
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }
    console.error("Error saving search config:", error);
    return NextResponse.json(
      { error: "Failed to save search config" },
      { status: 500 }
    );
  }
}
