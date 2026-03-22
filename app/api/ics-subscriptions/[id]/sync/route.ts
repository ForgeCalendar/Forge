import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { verifyOwnership } from "@/lib/verify-ownership";
import {
  parseIcsData,
  type ParsedIcsData,
  type IcsEvent,
  parseIcsDate,
} from "@jalexw/calendar-ics-parser";

function isAllDayDate(icsDateString: string): boolean {
  return !icsDateString.includes("T");
}

/**
 * Parse an ICS DURATION string (e.g. "PT1H30M", "P1D") into milliseconds.
 */
function parseIcsDuration(duration: string): number {
  const match = duration.match(
    /^P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/
  );
  if (!match) return 0;
  const weeks = parseInt(match[1] || "0");
  const days = parseInt(match[2] || "0");
  const hours = parseInt(match[3] || "0");
  const minutes = parseInt(match[4] || "0");
  const seconds = parseInt(match[5] || "0");
  return (
    ((weeks * 7 + days) * 24 * 3600 + hours * 3600 + minutes * 60 + seconds) *
    1000
  );
}

/**
 * Compute the ISO end date for an ICS event, handling DTEND, DURATION, and
 * fallback to a provided master duration (for modified occurrences).
 */
function computeEndDate(
  event: IcsEvent,
  startMs: number,
  masterDurationMs?: number
): string {
  if (event.dtend) {
    return parseIcsDate(event.dtend).toISOString();
  }
  if (event.duration) {
    return new Date(startMs + parseIcsDuration(event.duration)).toISOString();
  }
  if (masterDurationMs !== undefined) {
    return new Date(startMs + masterDurationMs).toISOString();
  }
  return new Date(startMs).toISOString();
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
      // Pass 1: group events by UID into masters and modifications
      const masters = new Map<string, IcsEvent>();
      const modifications = new Map<string, IcsEvent[]>();

      for (const event of calendar.events) {
        if (!event.dtstart) continue;
        const uid = event.uid;

        if (event.recurid) {
          // Modified occurrence of a recurring event
          if (!modifications.has(uid)) modifications.set(uid, []);
          modifications.get(uid)!.push(event);
        } else {
          // Master event (recurring or one-off)
          masters.set(uid, event);
        }
      }

      // Pass 2: upsert masters (with consolidated exdates), then modifications
      for (const [uid, master] of masters) {
        let startDate: string;
        let endDate: string;
        try {
          const startMs = parseIcsDate(master.dtstart!).getTime();
          startDate = new Date(startMs).toISOString();
          endDate = computeEndDate(master, startMs);
        } catch {
          continue;
        }

        const masterDurationMs =
          new Date(endDate).getTime() - new Date(startDate).getTime();
        const isAllDay = isAllDayDate(master.dtstart!);

        // Build consolidated exdates:
        //   1. Explicit EXDATE values from the master VEVENT
        //   2. RECURRENCE-ID of each modified occurrence (so rrule won't render
        //      the original slot when a modification exists at a different time)
        const exdateDates: string[] = [];
        for (const exdate of master.exdate ?? []) {
          try {
            exdateDates.push(parseIcsDate(exdate).toISOString());
          } catch {
            // skip unparseable exdate
          }
        }
        for (const mod of modifications.get(uid) ?? []) {
          if (mod.recurid) {
            try {
              exdateDates.push(parseIcsDate(mod.recurid).toISOString());
            } catch {
              // skip unparseable recurid
            }
          }
        }

        const exdatesJson =
          exdateDates.length > 0 ? JSON.stringify(exdateDates) : null;

        const sharedData = {
          title: master.summary ?? "(No title)",
          description: master.description ?? null,
          location: master.location ?? null,
          start: startDate,
          end: endDate,
          startTimezone: null,
          endTimezone: null,
          isAllDay,
          status: master.status ?? null,
          recurrenceRule: master.rrule ?? null,
          exdates: exdatesJson,
          categories: master.categories
            ? JSON.stringify(master.categories)
            : null,
          url: master.url ?? null,
          rawData: JSON.stringify(master),
        };

        await prisma.event.upsert({
          where: {
            subscriptionId_uid_recurid: {
              subscriptionId: subscription.id,
              uid,
              recurid: "",
            },
          },
          create: {
            userId,
            subscriptionId: subscription.id,
            uid,
            recurid: "",
            kind: "ics",
            ...sharedData,
          },
          update: sharedData,
        });
        synced++;

        // Upsert each modified occurrence
        for (const mod of modifications.get(uid) ?? []) {
          if (!mod.dtstart || !mod.recurid) continue;

          let modStart: string;
          let modEnd: string;
          try {
            const modStartMs = parseIcsDate(mod.dtstart).getTime();
            modStart = new Date(modStartMs).toISOString();
            modEnd = computeEndDate(mod, modStartMs, masterDurationMs);
          } catch {
            continue;
          }

          let recuridIso: string;
          try {
            recuridIso = parseIcsDate(mod.recurid).toISOString();
          } catch {
            recuridIso = mod.recurid;
          }

          const modIsAllDay = isAllDayDate(mod.dtstart);
          const modSharedData = {
            title: mod.summary ?? master.summary ?? "(No title)",
            description: mod.description ?? null,
            location: mod.location ?? null,
            start: modStart,
            end: modEnd,
            startTimezone: null,
            endTimezone: null,
            isAllDay: modIsAllDay,
            status: mod.status ?? null,
            recurrenceRule: null, // modifications are not themselves recurring
            exdates: null,
            categories: mod.categories
              ? JSON.stringify(mod.categories)
              : master.categories
              ? JSON.stringify(master.categories)
              : null,
            url: mod.url ?? master.url ?? null,
            rawData: JSON.stringify(mod),
          };

          await prisma.event.upsert({
            where: {
              subscriptionId_uid_recurid: {
                subscriptionId: subscription.id,
                uid,
                recurid: recuridIso,
              },
            },
            create: {
              userId,
              subscriptionId: subscription.id,
              uid,
              recurid: recuridIso,
              kind: "ics",
              ...modSharedData,
            },
            update: modSharedData,
          });
          synced++;
        }
      }

      // Upsert any modifications whose master wasn't in this feed
      // (e.g. a one-off edit of a recurring event from another calendar)
      for (const [uid, mods] of modifications) {
        if (masters.has(uid)) continue; // already handled above

        for (const mod of mods) {
          if (!mod.dtstart || !mod.recurid) continue;

          let modStart: string;
          let modEnd: string;
          try {
            const modStartMs = parseIcsDate(mod.dtstart).getTime();
            modStart = new Date(modStartMs).toISOString();
            modEnd = computeEndDate(mod, modStartMs);
          } catch {
            continue;
          }

          let recuridIso: string;
          try {
            recuridIso = parseIcsDate(mod.recurid).toISOString();
          } catch {
            recuridIso = mod.recurid;
          }

          const modIsAllDay = isAllDayDate(mod.dtstart);
          const modSharedData = {
            title: mod.summary ?? "(No title)",
            description: mod.description ?? null,
            location: mod.location ?? null,
            start: modStart,
            end: modEnd,
            startTimezone: null,
            endTimezone: null,
            isAllDay: modIsAllDay,
            status: mod.status ?? null,
            recurrenceRule: null,
            exdates: null,
            categories: mod.categories ? JSON.stringify(mod.categories) : null,
            url: mod.url ?? null,
            rawData: JSON.stringify(mod),
          };

          await prisma.event.upsert({
            where: {
              subscriptionId_uid_recurid: {
                subscriptionId: subscription.id,
                uid,
                recurid: recuridIso,
              },
            },
            create: {
              userId,
              subscriptionId: subscription.id,
              uid,
              recurid: recuridIso,
              kind: "ics",
              ...modSharedData,
            },
            update: modSharedData,
          });
          synced++;
        }
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
