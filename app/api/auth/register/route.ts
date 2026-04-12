import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, setAuthCookie } from "@/lib/auth";
import { generateSalt } from "@/lib/crypto/server";
import { SaltPurpose } from "@/lib/generated/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password } = body;

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
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

    // Validate password strength (minimum 8 characters)
    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters long" },
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

    // Hash password and create user with salts in a transaction
    const passwordHash = await hashPassword(password);
    const user = await prisma.$transaction(async (tx) => {
      // Create user
      const newUser = await tx.user.create({
        data: {
          id: email,
          passwordHash,
        },
      });

      // Create salts for all purposes
      const saltPurposes = Object.values(SaltPurpose);
      await Promise.all(
        saltPurposes.map((purpose) =>
          tx.userSalt.create({
            data: {
              userId: newUser.id,
              purpose,
              salt: generateSalt(),
            },
          })
        )
      );

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
