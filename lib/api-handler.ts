import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";

export function apiHandler<TCtx = unknown>(
  handler: (
    userId: string,
    req: Request,
    ctx: TCtx
  ) => Promise<NextResponse | Response>
): (...args: [req?: Request, ctx?: TCtx]) => Promise<NextResponse | Response> {
  return async (...args: [req?: Request, ctx?: TCtx]) => {
    try {
      const userId = await requireAuth();
      return await handler(userId, args[0] as Request, args[1] as TCtx);
    } catch (error) {
      if (error instanceof Error && error.message === "Unauthorized") {
        return NextResponse.json(
          { error: "Authentication required" },
          { status: 401 }
        );
      }
      console.error(error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  };
}
