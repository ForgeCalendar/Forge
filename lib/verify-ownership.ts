import { NextResponse } from "next/server";

/**
 * Verify that a database record exists (typically after a findFirst with userId filter).
 * Returns the record if found, or a 404 NextResponse if not.
 *
 * Usage:
 * ```ts
 * const result = await verifyOwnership(
 *   prisma.event.findFirst({ where: { id, userId } }),
 *   "Event not found"
 * );
 * if (result instanceof NextResponse) return result;
 * // result is now the typed Prisma record
 * ```
 */
export async function verifyOwnership<T>(
  query: Promise<T | null>,
  notFoundMessage: string
): Promise<T | NextResponse> {
  const record = await query;
  if (!record) {
    return NextResponse.json(
      { error: notFoundMessage },
      { status: 404 }
    );
  }
  return record;
}
