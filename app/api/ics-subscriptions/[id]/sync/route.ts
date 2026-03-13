import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import type { VEvent, CalendarComponent, ParameterValue } from "node-ical";
import {
  parseIcsData,
  formatParsedData,
  type ParsedIcsData,
  parseIcsDate,
} from "@jalexw/calendar-ics-parser";

function extractParameterValue(pv: ParameterValue | undefined): string | null {
  if (!pv) return null;
  return typeof pv === "string" ? pv : pv.val;
}

function parseIcsDateToISO(icsDateString: string): string {
  if (!icsDateString) return new Date().toISOString();

  const isAlreadyISO = icsDateString.includes("-");
  if (isAlreadyISO) {
    return new Date(icsDateString).toISOString();
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
    return new Date(isoFormatted).toISOString();
  }

  if (dateWithoutZ.length === 8) {
    const year = dateWithoutZ.substring(0, 4);
    const month = dateWithoutZ.substring(4, 6);
    const day = dateWithoutZ.substring(6, 8);
    return `${year}-${month}-${day}T00:00:00.000Z`;
  }

  return new Date(icsDateString).toISOString();
}

// POST /api/ics-subscriptions/:id/sync - Sync events from an ICS subscription
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireAuth();
    const { id } = await params;

    const subscription = await prisma.icsSubscription.findFirst({
      where: { id, userId },
    });

    if (!subscription) {
      return NextResponse.json(
        { error: "Subscription not found" },
        { status: 404 }
      );
    }

    let calendarData: ParsedIcsData;
    let response = await fetch(subscription.url);
    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch ICS data from URL" },
        { status: 502 }
      );
    }
    try {
      let text: string = await response.text();
      console.log(text);
      calendarData = await parseIcsData(text);
    } catch (parseError) {
      console.error("Error parsing ICS data:", parseError);
      return NextResponse.json(
        { error: "ICS Parsing failed." },
        { status: 500 }
      );
    }
    console.log(calendarData);
    calendarData.calendars;
    let synced = 0;
    calendarData.calendars.forEach((calendar) => {
      calendar.events.forEach(async (event) => {
        const uid = event.uid;

        const startDate = parseIcsDateToISO(event.dtstart ?? "");
        const endDate = parseIcsDateToISO(event.dtend ?? event.dtstart ?? "");

        await prisma.event.upsert({
          where: {
            subscriptionId_uid: {
              subscriptionId: subscription.id,
              uid,
            },
          },
          create: {
            userId,
            subscriptionId: subscription.id,
            uid,
            title: extractParameterValue(event.summary) ?? "(No title)",
            description: extractParameterValue(event.description) ?? null,
            location: extractParameterValue(event.location) ?? null,
            start: startDate,
            end: endDate,
            startTimezone: null,
            endTimezone: null,
            isAllDay: false,
            status: event.status ?? null,
            recurrenceRule: event.rrule ? event.rrule.toString() : null,
            categories: event.categories
              ? JSON.stringify(event.categories)
              : null,
            url: event.url ?? null,
            rawData: JSON.stringify(event),
            kind: "ics",
          },
          update: {
            title: extractParameterValue(event.summary) ?? "(No title)",
            description: extractParameterValue(event.description),
            location: extractParameterValue(event.location),
            start: startDate,
            end: endDate,
            startTimezone: null,
            endTimezone: null,
            isAllDay: false,
            status: event.status ?? null,
            recurrenceRule: event.rrule ? event.rrule.toString() : null,
            categories: event.categories
              ? JSON.stringify(event.categories)
              : null,
            url: event.url ?? null,
            rawData: JSON.stringify(event),
          },
        });
        synced++;
      });
    });

    await prisma.icsSubscription.update({
      where: { id: subscription.id },
      data: { lastSynced: new Date() },
    });

    return NextResponse.json({
      message: `Synced ${synced} events`,
      syncedCount: synced,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }
    console.error("Error syncing ICS subscription:", error);
    return NextResponse.json(
      { error: "Failed to sync ICS subscription" },
      { status: 500 }
    );
  }
}
