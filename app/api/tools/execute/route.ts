/**
 * Tool execution API endpoint.
 * Allows client-side AI to execute tools that require database access.
 */

import { NextRequest, NextResponse } from "next/server";
import { executeToolServer } from "@/lib/tools/executor";
import { getToolsForRole, type ToolName } from "@/lib/tools/schemas";
import { requireAuth } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user
    const userId = await requireAuth();

    // 2. Parse request body
    const body = await request.json();
    const { tool, parameters, context } = body;

    if (!tool || typeof tool !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid tool name" },
        { status: 400 }
      );
    }

    // 3. Validate tool name (security check)
    const role = context?.role || "Assistant";
    const allowedTools = getToolsForRole(role);

    if (!allowedTools.includes(tool as ToolName)) {
      return NextResponse.json(
        { error: `Invalid or unauthorized tool: ${tool}` },
        { status: 400 }
      );
    }

    // 4. Execute tool
    const result = await executeToolServer(
      tool as ToolName,
      parameters || {},
      userId,
      {
        chatHistoryId: context?.chatHistoryId,
        goalId: context?.goalId,
      }
    );

    // 5. Return result
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Tool execution error:", error);

    // Handle validation errors (from Zod)
    if (error.name === "ZodError") {
      return NextResponse.json(
        {
          error: "Invalid parameters",
          details: error.errors,
        },
        { status: 400 }
      );
    }

    // Handle other errors
    return NextResponse.json(
      {
        error: "Tool execution failed",
        message: error.message,
      },
      { status: 500 }
    );
  }
}
