"use client";

import {
  Box,
  Flex,
  Text,
  Button,
  Dialog,
  Portal,
  CloseButton,
} from "@chakra-ui/react";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import rrulePlugin from "@fullcalendar/rrule";
import momentTimezonePlugin from "@fullcalendar/moment-timezone";
import type React from "react";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useThemeTokens } from "@/lib/theme-tokens";
import { useCalendarEvents } from "@/storage/hooks";

export default function CalendarView({
  calendarRef,
  currentView,
  setCurrentView,
  onTitleChange,
  initialDate,
  onCalendarChange,
  timezone,
}: {
  calendarRef: React.RefObject<FullCalendar | null>;
  currentView: string[];
  setCurrentView: (v: string[]) => void;
  onTitleChange: (title: string) => void;
  initialDate: string;
  onCalendarChange: (date: string, view: string) => void;
  timezone: string;
}) {
  const router = useRouter();
  const {
    events: calendarEvents,
    isLoading,
    update: updateCalendarEvent,
    delete: deleteEvent,
  } = useCalendarEvents();
  const [selectedEvent, setSelectedEvent] = useState<{
    id: string;
    title: string;
    kind: string;
    start: Date | null;
    end: Date | null;
    confirmed: boolean;
  } | null>(null);

  const { textHeading: headingColor, textMuted: subColor } = useThemeTokens();

  // Track last synced values to prevent feedback loops
  const lastSyncedDate = useRef<string>(initialDate);
  const lastSyncedView = useRef<string>(currentView[0]);

  // Sync calendar when URL params change (external navigation)
  useEffect(() => {
    if (calendarRef.current && currentView.length > 0) {
      const calendarApi = calendarRef.current.getApi();
      const currentCalendarView = calendarApi.view.type;

      // Format currentStart in the calendar's configured timezone to avoid
      // UTC off-by-one errors for positive-offset timezones (e.g. Asia/Tokyo).
      // "en-CA" locale reliably produces YYYY-MM-DD format.
      const tz =
        timezone === "local"
          ? Intl.DateTimeFormat().resolvedOptions().timeZone
          : timezone;
      const currentCalendarDate = new Intl.DateTimeFormat("en-CA", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        timeZone: tz,
      }).format(calendarApi.view.currentStart);

      const nextView = currentView[0];
      const nextDate = initialDate;

      // Check if view needs to change
      const viewChanged =
        currentCalendarView !== nextView && lastSyncedView.current !== nextView;

      // Check if date needs to change
      const dateChanged =
        nextDate !== currentCalendarDate && lastSyncedDate.current !== nextDate;

      if (viewChanged || dateChanged) {
        // Update both refs before triggering calendar navigation so any
        // intermediate datesSet emission observes a consistent target state.
        if (viewChanged) {
          lastSyncedView.current = nextView;
        }
        if (dateChanged) {
          lastSyncedDate.current = nextDate;
        }

        if (viewChanged && dateChanged) {
          calendarApi.changeView(nextView, nextDate);
        } else if (viewChanged) {
          calendarApi.changeView(nextView);
        } else {
          calendarApi.gotoDate(nextDate);
        }
      }
    }
  }, [calendarRef, currentView, initialDate, timezone]);

  const formatTime = (date: Date | null) => {
    if (!date) return "\u2014";
    return date.toLocaleString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: timezone === "local" ? undefined : timezone,
    });
  };

  return (
    <Box flex={1} p={2} height="100%" minHeight={0} overflow="hidden">
      {isLoading ? (
        <Box p={4}>
          <Text>Loading events...</Text>
        </Box>
      ) : (
        <Box minHeight={0} height="100%">
          <FullCalendar
            ref={calendarRef}
            plugins={[
              rrulePlugin,
              dayGridPlugin,
              timeGridPlugin,
              interactionPlugin,
              momentTimezonePlugin,
            ]}
            initialView={currentView[0]}
            initialDate={initialDate}
            timeZone={timezone}
            headerToolbar={false}
            nowIndicator={true}
            scrollTimeReset={false}
            height="100%"
            allDaySlot={false}
            slotDuration="00:30:00"
            slotLabelInterval="01:00"
            expandRows={true}
            weekends={true}
            editable={true}
            eventStartEditable={true}
            eventDurationEditable={true}
            events={calendarEvents}
            datesSet={(info) => {
              onTitleChange(info.view.title);
              // info.startStr is already formatted in the calendar's timezone
              const dateStr = info.startStr.slice(0, 10);
              const viewType = info.view.type;

              // Only sync to URL if values actually changed
              if (
                dateStr !== lastSyncedDate.current ||
                viewType !== lastSyncedView.current
              ) {
                lastSyncedDate.current = dateStr;
                lastSyncedView.current = viewType;
                onCalendarChange(dateStr, viewType);
              }
            }}
            dateClick={(info) => {
              if (currentView[0] === "dayGridMonth") {
                const calendarApi = calendarRef.current?.getApi();
                if (calendarApi) {
                  calendarApi.gotoDate(info.dateStr);
                  calendarApi.changeView("timeGridDay");
                  setCurrentView(["timeGridDay"]);
                }
              }
            }}
            eventClick={(info) => {
              setSelectedEvent({
                id: info.event.id,
                title: info.event.title,
                kind: info.event.extendedProps?.kind ?? "task",
                start: info.event.start,
                end: info.event.end,
                confirmed: info.event.extendedProps?.confirmed ?? true,
              });
            }}
            eventDidMount={(info) => {
              const confirmed = info.event.extendedProps?.confirmed ?? true;
              if (!confirmed) {
                info.el.style.border = "2px dashed #f97316";
                info.el.style.backgroundColor = "rgba(249, 115, 22, 0.6)";
              }
            }}
            eventDrop={async (info) => {
              try {
                await updateCalendarEvent(info.event.id, {
                  start: info.event.start!,
                  end: info.event.end!,
                });
              } catch {
                info.revert();
              }
            }}
            eventResize={async (info) => {
              try {
                await updateCalendarEvent(info.event.id, {
                  start: info.event.start!,
                  end: info.event.end!,
                });
              } catch {
                info.revert();
              }
            }}
          />
        </Box>
      )}

      <Dialog.Root
        open={!!selectedEvent}
        onOpenChange={(e) => {
          if (!e.open) setSelectedEvent(null);
        }}
      >
        <Portal>
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content>
              <Dialog.Header>
                <Dialog.Title>{selectedEvent?.title}</Dialog.Title>
                <Dialog.CloseTrigger asChild>
                  <CloseButton
                    size="sm"
                    position="absolute"
                    top={3}
                    right={3}
                  />
                </Dialog.CloseTrigger>
              </Dialog.Header>
              <Dialog.Body>
                <Flex direction="column" gap={2}>
                  <Flex gap={2}>
                    <Text fontWeight="bold" color={headingColor}>
                      Type:
                    </Text>
                    <Text color={subColor}>{selectedEvent?.kind}</Text>
                  </Flex>
                  <Flex gap={2}>
                    <Text fontWeight="bold" color={headingColor}>
                      Start:
                    </Text>
                    <Text color={subColor}>
                      {formatTime(selectedEvent?.start ?? null)}
                    </Text>
                  </Flex>
                  <Flex gap={2}>
                    <Text fontWeight="bold" color={headingColor}>
                      End:
                    </Text>
                    <Text color={subColor}>
                      {formatTime(selectedEvent?.end ?? null)}
                    </Text>
                  </Flex>
                </Flex>
              </Dialog.Body>
              <Dialog.Footer>
                <Dialog.ActionTrigger asChild>
                  <Button variant="outline" size="sm">
                    Close
                  </Button>
                </Dialog.ActionTrigger>
                {selectedEvent && !selectedEvent.confirmed && (
                  <Button
                    colorPalette="orange"
                    size="sm"
                    onClick={async () => {
                      if (selectedEvent?.id) {
                        try {
                          await updateCalendarEvent(selectedEvent.id, {
                            confirmed: true,
                          });
                          setSelectedEvent({
                            ...selectedEvent,
                            confirmed: true,
                          });
                        } catch {
                          // update failed
                        }
                      }
                    }}
                  >
                    Confirm Event
                  </Button>
                )}
                <Button
                  colorScheme="blue"
                  size="sm"
                  onClick={() => {
                    if (selectedEvent?.id) {
                      router.push(`/zen-mode?eventId=${selectedEvent.id}`);
                    }
                  }}
                >
                  Enter Zen Mode
                </Button>
                <Button
                  colorPalette="red"
                  size="sm"
                  onClick={async () => {
                    if (selectedEvent?.id) {
                      try {
                        await deleteEvent(selectedEvent.id);
                      } catch {
                        // deletion failed — event stays
                      }
                      setSelectedEvent(null);
                    }
                  }}
                >
                  Delete Event
                </Button>
              </Dialog.Footer>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>
    </Box>
  );
}
