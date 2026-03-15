import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";

export function apiHandler<TCtx = unknown>(
  handler: (
    userId: string,
    req: Request,
    ctx: TCtx
  ) => Promise<NextResponse | Response>,
  label?: string
): (req?: Request, ctx?: TCtx) => Promise<NextResponse | Response> {
  return async (req?: Request, ctx?: TCtx) => {
    try {
      const userId = await requireAuth();
      return await handler(
        userId,
        req ?? new Request("http://localhost"),
        ctx ?? ({} as TCtx)
      );
    } catch (error) {
      if (error instanceof Error && error.message === "Unauthorized") {
        return NextResponse.json(
          { error: "Authentication required" },
          { status: 401 }
        );
      }
      console.error(label ? `[${label}]` : "[apiHandler]", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  };
}
