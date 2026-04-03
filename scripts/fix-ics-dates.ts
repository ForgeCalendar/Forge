/**
 * DEPRECATED: This script was used to fix ICS dates when they were stored as strings.
 * With the migration to DateTime fields, this script is no longer needed.
 * Prisma now handles date parsing automatically.
 *
 * Keeping this file for reference only.
 */

import { PrismaClient } from "../lib/generated/prisma";

const prisma = new PrismaClient();

async function main() {
  console.log("Checking ICS events...");

  const icsEvents = await prisma.event.findMany({
    where: {
      subscriptionId: { not: null },
    },
    select: {
      id: true,
      start: true,
      end: true,
    },
  });

  console.log(`Found ${icsEvents.length} ICS events`);

  // With DateTime fields, all dates are now properly stored as Date objects
  // No migration needed - this script is kept for reference only
  let validCount = 0;
  for (const event of icsEvents) {
    if (event.start instanceof Date && event.end instanceof Date) {
      validCount++;
    }
  }

  console.log(`All ${validCount} events have valid DateTime values`);
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
