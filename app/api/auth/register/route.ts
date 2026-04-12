import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { setAuthCookie } from "@/lib/auth";
import { hashAuthkey } from "@/lib/crypto/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, authkey, salt } = body;

    // Validate input
    if (!email || !authkey || !salt) {
      return NextResponse.json(
        { error: "Email, authkey, and salt are required" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // Validate salt: must be valid base64 and decode to exactly 32 bytes
    if (Buffer.from(salt, "base64").length !== 32) {
      return NextResponse.json(
        { error: "Invalid salt: must be a base64-encoded 32-byte value" },
        { status: 400 }
      );
    }

    // Validate authkey: must be valid base64 and decode to exactly 32 bytes (AES-256)
    if (Buffer.from(authkey, "base64").length !== 32) {
      return NextResponse.json(
        { error: "Invalid authkey: must be a base64-encoded 32-byte value" },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { id: email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 409 }
      );
    }

    // Hash authkey and create user with salt in a transaction
    const authkeyHash = await hashAuthkey(authkey);
    const user = await prisma.$transaction(async (tx) => {
      // Create user
      const newUser = await tx.user.create({
        data: {
          id: email,
          authkeyHash: authkeyHash,
        },
      });

      // Create salt for the user
      await tx.userSalt.create({
        data: {
          userId: newUser.id,
          salt: salt,
        },
      });

      return newUser;
    });

    // Set auth cookie
    await setAuthCookie(email);

    return NextResponse.json(
      {
        message: "User registered successfully",
        user: {
          email: user.id,
          createdAt: user.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error registering user:", error);
    return NextResponse.json(
      { error: "Failed to register user" },
      { status: 500 }
    );
  }
}
