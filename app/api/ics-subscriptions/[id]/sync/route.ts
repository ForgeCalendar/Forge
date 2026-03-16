import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { verifyOwnership } from "@/lib/verify-ownership";
import {
  parseIcsData,
  type ParsedIcsData,
  parseIcsDate,
} from "@jalexw/calendar-ics-parser";

function isAllDayDate(icsDateString: string): boolean {
  return !icsDateString.includes("T");
}

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(
  _req: Request,
  ctx: RouteContext
): Promise<NextResponse> {
  try {
    const userId = await requireAuth();
    const { id } = await ctx.params;

    const subscription = await verifyOwnership(
      prisma.icsSubscription.findFirst({ where: { id, userId } }),
      "Subscription not found"
    );
    if (subscription instanceof NextResponse) return subscription;

    // Validate URL scheme to prevent SSRF
    try {
      const parsed = new URL(subscription.url);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        return NextResponse.json(
          { error: "Only http and https URLs are allowed" },
          { status: 400 }
        );
      }
    } catch {
      return NextResponse.json(
        { error: "Invalid subscription URL" },
        { status: 400 }
      );
    }

    let calendarData: ParsedIcsData;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30_000);
    let response: Response;
    try {
      response = await fetch(subscription.url, { signal: controller.signal });
    } catch (fetchError) {
      console.error("Error fetching ICS data:", fetchError);
      return NextResponse.json(
        { error: "Failed to fetch ICS data from URL" },
        { status: 502 }
      );
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch ICS data from URL" },
        { status: 502 }
      );
    }

    try {
      const text: string = await response.text();
      calendarData = await parseIcsData(text);
    } catch (parseError) {
      console.error("Error parsing ICS data:", parseError);
      return NextResponse.json(
        { error: "ICS Parsing failed." },
        { status: 422 }
      );
    }

    let synced = 0;
    for (const calendar of calendarData.calendars) {
      for (const event of calendar.events) {
        const uid = event.uid;

        if (!event.dtstart) continue;

        let startDate: string;
        let endDate: string;
        try {
          startDate = parseIcsDate(event.dtstart).toISOString();
          endDate = parseIcsDate(event.dtend ?? event.dtstart).toISOString();
        } catch {
          continue;
        }

        const isAllDay = isAllDayDate(event.dtstart);

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
            title: event.summary ?? "(No title)",
            description: event.description ?? null,
            location: event.location ?? null,
            start: startDate,
            end: endDate,
            startTimezone: null,
            endTimezone: null,
            isAllDay,
            status: event.status ?? null,
            recurrenceRule: event.rrule ?? null,
            categories: event.categories
              ? JSON.stringify(event.categories)
              : null,
            url: event.url ?? null,
            rawData: JSON.stringify(event),
            kind: "ics",
          },
          update: {
            title: event.summary ?? "(No title)",
            description: event.description ?? null,
            location: event.location ?? null,
            start: startDate,
            end: endDate,
            startTimezone: null,
            endTimezone: null,
            isAllDay,
            status: event.status ?? null,
            recurrenceRule: event.rrule ?? null,
            categories: event.categories
              ? JSON.stringify(event.categories)
              : null,
            url: event.url ?? null,
            rawData: JSON.stringify(event),
          },
        });
        synced++;
      }
    }

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
