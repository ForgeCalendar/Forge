import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { setAuthCookie } from "@/lib/auth";
import { verifyAuthkey } from "@/lib/crypto/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, authkey } = body;

    // Validate input
    if (!email || !authkey) {
      return NextResponse.json(
        { error: "Email and authkey are required" },
        { status: 400 }
      );
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { id: email },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Invalid email or authkey" },
        { status: 401 }
      );
    }

    // Verify authkey against stored hash
    const isValidAuthkey = await verifyAuthkey(authkey, user.authkeyHash);

    if (!isValidAuthkey) {
      return NextResponse.json(
        { error: "Invalid email or authkey" },
        { status: 401 }
      );
    }

    // Set auth cookie
    await setAuthCookie(email);

    return NextResponse.json({
      message: "Login successful",
      user: {
        email: user.id,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("Error logging in:", error);
    return NextResponse.json({ error: "Failed to login" }, { status: 500 });
  }
}
