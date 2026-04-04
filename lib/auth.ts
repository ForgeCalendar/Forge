import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";
import { prisma } from "./prisma";

const SALT_ROUNDS = 10;
const SESSION_COOKIE_NAME = "session_user_email";

// Read the cookie signing secret from the environment
function getCookieSecret(): string {
  const secret = process.env.COOKIE_SECRET;
  if (!secret) {
    throw new Error(
      "COOKIE_SECRET environment variable is required for secure sessions"
    );
  }
  return secret;
}

// Sign a value using HMAC-SHA256
function signValue(value: string): string {
  const secret = getCookieSecret();
  const signature = createHmac("sha256", secret)
    .update(value)
    .digest("base64url");
  return `${value}.${signature}`;
}

// Verify and extract the original value from a signed value
function verifySignedValue(signedValue: string): string | null {
  const lastDotIndex = signedValue.lastIndexOf(".");
  if (lastDotIndex === -1) {
    return null;
  }

  const value = signedValue.slice(0, lastDotIndex);
  const providedSignature = signedValue.slice(lastDotIndex + 1);

  const secret = getCookieSecret();
  const expectedSignature = createHmac("sha256", secret)
    .update(value)
    .digest("base64url");

  // Timing-safe comparison to prevent timing attacks
  const providedBuffer = Buffer.from(providedSignature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (providedBuffer.length !== expectedBuffer.length) {
    return null;
  }

  const isValid = timingSafeEqual(providedBuffer, expectedBuffer);
  return isValid ? value : null;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function setAuthCookie(email: string): Promise<void> {
  const cookieStore = await cookies();
  const signedValue = signValue(email);
  cookieStore.set(SESSION_COOKIE_NAME, signedValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
  });
}

export async function clearAuthCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function getCurrentUser(): Promise<string | null> {
  const cookieStore = await cookies();
  const signedValue = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!signedValue) {
    return null;
  }

  // Verify signature and extract email
  const email = verifySignedValue(signedValue);
  if (!email) {
    return null;
  }

  // Verify user still exists
  const user = await prisma.user.findUnique({
    where: { id: email },
  });

  return user ? email : null;
}

export async function requireAuth(): Promise<string> {
  const email = await getCurrentUser();

  if (!email) {
    throw new Error("Unauthorized");
  }

  return email;
}
