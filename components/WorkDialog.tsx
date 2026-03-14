import {
  Box,
  Button,
  Text,
  CloseButton,
  Dialog,
  Portal,
  HStack,
  RadioCard,
} from "@chakra-ui/react";
import type { GoalWithId } from "@/storage/types";
import { useState } from "react";
import { useCalendarEvents } from "@/storage/hooks";
import { toaster } from "@/components/ui/toaster";
import { useThemeTokens } from "@/lib/theme-tokens";

export function WorkDialog({ goal }: { goal: GoalWithId }) {
  const defaultVal = goal.events && goal.events.length > 0 ? "0" : "";
  const [selected, setSelected] = useState<string>(defaultVal);
  const [isOpen, setIsOpen] = useState(false);
  const { create: createCalendarEvent } = useCalendarEvents();
  const { textMuted, textSecondary } = useThemeTokens();

  const handleStartWork = async () => {
    if (!goal.events || goal.events.length === 0) {
      toaster.create({
        title: "No events available",
        description: "Please add events to this goal first.",
        type: "error",
      });
      return;
    }

    const selectedIndex = parseInt(selected, 10);
    const selectedEvent = goal.events[selectedIndex];

    if (!selectedEvent) {
      toaster.create({
        title: "Please select an event",
        description: "Choose an event to start working on.",
        type: "warning",
      });
      return;
    }

    // Calculate start and end times
    const startTime = new Date();
    const durationMinutes = selectedEvent.minutesEstimate || 25; // Default 25 min if not set
    const endTime = new Date(startTime.getTime() + durationMinutes * 60000);

    try {
      await createCalendarEvent({
        title: selectedEvent.title,
        start: startTime,
        end: endTime,
        extendedProps: {
          kind: "task",
          goalId: goal.id,
          goalTitle: goal.title,
        },
      });

      toaster.create({
        title: "Work session started! 🎯",
        description: `${selectedEvent.title} (${durationMinutes} min)`,
        type: "success",
      });

      // Close the dialog
      setIsOpen(false);
    } catch (error) {
      console.error("Failed to create calendar event:", error);
      toaster.create({
        title: "Failed to start work session",
        description: "Please try again.",
        type: "error",
      });
    }
  };

  return (
    <Dialog.Root
      size="lg"
      open={isOpen}
      onOpenChange={(e) => setIsOpen(e.open)}
    >
      <Dialog.Trigger asChild>
        <Button size="sm" colorScheme="blue">
          Work!
        </Button>
      </Dialog.Trigger>

      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>Work on goal</Dialog.Title>
            </Dialog.Header>

            <Dialog.Body>
              <Box>
                <Text fontWeight="semibold">{goal.title}</Text>
                <Text mt={2} color={textMuted}>
                  Choose a event to work on for this session.
                </Text>

                {goal.events && goal.events.length > 0 ? (
                  <Box mt={3}>
                    <RadioCard.Root
                      defaultValue={defaultVal}
                      onValueChange={(details) =>
                        setSelected(String(details.value ?? ""))
                      }
                      variant="solid"
                    >
                      <RadioCard.Label>Select event</RadioCard.Label>
                      <HStack align="stretch">
                        {goal.events.map((d, idx) => (
                          <RadioCard.Item key={`del-${idx}`} value={`${idx}`}>
                            <RadioCard.ItemHiddenInput />
                            <RadioCard.ItemControl>
                              <RadioCard.ItemContent>
                                <RadioCard.ItemText>
                                  {d.title}
                                </RadioCard.ItemText>
                                {d.minutesEstimate ? (
                                  <RadioCard.ItemDescription>
                                    {d.minutesEstimate} min
                                  </RadioCard.ItemDescription>
                                ) : null}
                              </RadioCard.ItemContent>
                              <RadioCard.ItemIndicator />
                            </RadioCard.ItemControl>
                          </RadioCard.Item>
                        ))}
                      </HStack>
                    </RadioCard.Root>
                  </Box>
                ) : (
                  <Text mt={3} color={textSecondary}>
                    No events defined for this goal.
                  </Text>
                )}
              </Box>
            </Dialog.Body>

            <Dialog.Footer>
              <Dialog.ActionTrigger asChild>
                <Button variant="ghost">Cancel</Button>
              </Dialog.ActionTrigger>
              <Button
                colorScheme="blue"
                onClick={handleStartWork}
                disabled={!goal.events || goal.events.length === 0}
              >
                Start
              </Button>
            </Dialog.Footer>

            <Dialog.CloseTrigger asChild>
              <CloseButton size="sm" />
            </Dialog.CloseTrigger>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}

export default WorkDialog;
