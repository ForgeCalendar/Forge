import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import * as ical from "node-ical";
import type { VEvent, CalendarComponent, ParameterValue } from "node-ical";

function extractParameterValue(pv: ParameterValue | undefined): string | null {
  if (!pv) return null;
  return typeof pv === "string" ? pv : pv.val;
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

    let calendarData: ical.CalendarResponse;
    try {
      calendarData = await ical.async.fromURL(subscription.url);
    } catch (fetchError) {
      console.error("Error fetching ICS data:", fetchError);
      return NextResponse.json(
        { error: "Failed to fetch ICS data from URL" },
        { status: 502 }
      );
    }

    const events = Object.values(calendarData).filter(
      (
        component: CalendarComponent | ical.VCalendar | undefined
      ): component is VEvent =>
        component !== undefined && component.type === "VEVENT"
    );

    let synced = 0;
    for (const event of events) {
      const uid = event.uid;
      if (!uid) continue;

      const startDate = event.start;
      const endDate = event.end;
      const isAllDay = event.datetype === "date";

      await prisma.icsEvent.upsert({
        where: {
          subscriptionId_uid: {
            subscriptionId: subscription.id,
            uid,
          },
        },
        create: {
          subscriptionId: subscription.id,
          uid,
          summary: extractParameterValue(event.summary) ?? null,
          description: extractParameterValue(event.description) ?? null,
          location: extractParameterValue(event.location) ?? null,
          start: startDate.toISOString(),
          end: endDate ? endDate.toISOString() : null,
          startTimezone: startDate.tz ?? null,
          endTimezone: endDate?.tz ?? null,
          isAllDay,
          status: event.status ?? null,
          organizer: extractParameterValue(event.organizer) ?? null,
          recurrenceRule: event.rrule ? event.rrule.toString() : null,
          transparency: event.transparency ?? null,
          categories: event.categories
            ? JSON.stringify(event.categories)
            : null,
          url: event.url ?? null,
          rawData: JSON.stringify(event),
        },
        update: {
          summary: extractParameterValue(event.summary) ?? null,
          description: extractParameterValue(event.description) ?? null,
          location: extractParameterValue(event.location) ?? null,
          start: startDate.toISOString(),
          end: endDate ? endDate.toISOString() : null,
          startTimezone: startDate.tz ?? null,
          endTimezone: endDate?.tz ?? null,
          isAllDay,
          status: event.status ?? null,
          organizer: extractParameterValue(event.organizer) ?? null,
          recurrenceRule: event.rrule ? event.rrule.toString() : null,
          transparency: event.transparency ?? null,
          categories: event.categories
            ? JSON.stringify(event.categories)
            : null,
          url: event.url ?? null,
          rawData: JSON.stringify(event),
        },
      });
      synced++;
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
