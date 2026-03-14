import { PrismaClient } from "../lib/generated/prisma";

const prisma = new PrismaClient();

function parseIcsDateToISO(icsDateString: string): string {
  if (!icsDateString) return new Date().toISOString();

  const isAlreadyISO = icsDateString.includes("-");
  if (isAlreadyISO) {
    return icsDateString;
  }

  const isUTC = icsDateString.endsWith("Z");
  const dateWithoutZ = icsDateString.replace("Z", "");

  const tIndex = dateWithoutZ.indexOf("T");
  const hasTime = tIndex !== -1;

  if (hasTime && dateWithoutZ.length >= 15) {
    const year = dateWithoutZ.substring(0, 4);
    const month = dateWithoutZ.substring(4, 6);
    const day = dateWithoutZ.substring(6, 8);
    const hour = dateWithoutZ.substring(tIndex + 1, tIndex + 3);
    const minute = dateWithoutZ.substring(tIndex + 3, tIndex + 5);
    const second = dateWithoutZ.substring(tIndex + 5, tIndex + 7) || "00";

    const isoFormatted = `${year}-${month}-${day}T${hour}:${minute}:${second}${
      isUTC ? ".000Z" : ""
    }`;
    return isoFormatted;
  }

  if (dateWithoutZ.length === 8) {
    const year = dateWithoutZ.substring(0, 4);
    const month = dateWithoutZ.substring(4, 6);
    const day = dateWithoutZ.substring(6, 8);
    return `${year}-${month}-${day}T00:00:00.000Z`;
  }

  return new Date(icsDateString).toISOString();
}

async function main() {
  console.log("Fetching ICS events with invalid date formats...");

  const icsEvents = await prisma.event.findMany({
    where: {
      subscriptionId: { not: null },
    },
  });

  console.log(`Found ${icsEvents.length} ICS events to check`);

  let updated = 0;
  for (const event of icsEvents) {
    const needsUpdate = !event.start.includes("-") || !event.end.includes("-");

    if (needsUpdate) {
      const newStart = parseIcsDateToISO(event.start);
      const newEnd = parseIcsDateToISO(event.end);

      await prisma.event.update({
        where: { id: event.id },
        data: {
          start: newStart,
          end: newEnd,
          startTimezone: null,
          endTimezone: null,
        },
      });

      updated++;
      if (updated % 50 === 0) {
        console.log(`Updated ${updated} events...`);
      }
    }
  }

  console.log(`\nFixed ${updated} ICS events with invalid date formats`);
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
