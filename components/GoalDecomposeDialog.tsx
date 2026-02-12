import {
  Box,
  Button,
  CloseButton,
  Dialog,
  Portal,
  Text,
} from "@chakra-ui/react";
import { ChatboxComponent } from "@/components/Chatbox";
import { goalDecomposePrompt } from "@/components/prompts";
import { useQueryClient } from "@tanstack/react-query";
import { goalKeys } from "@/storage/useGoalsQuery";
import { eventKeys } from "@/storage/useEventsQuery";
import { useMemo } from "react";
import { useColorModeValue } from "@/components/ui/color-mode";

type Props = {
  goalId: string;
  goalTitle: string;
  goalDescription: string;
  dueDate: string | null;
  open: boolean;
  onClose: () => void;
};

export default function GoalDecomposeDialog({
  goalId,
  goalTitle,
  goalDescription,
  dueDate,
  open,
  onClose,
}: Props) {
  const queryClient = useQueryClient();
  const subtitleColor = useColorModeValue("gray.500", "gray.400");

  const systemPrompt = useMemo(
    () => goalDecomposePrompt(goalTitle, goalDescription, dueDate),
    [goalTitle, goalDescription, dueDate]
  );

  const extraParams = useMemo(() => ({ goalId }), [goalId]);

  function handleClose() {
    queryClient.invalidateQueries({ queryKey: goalKeys.all });
    queryClient.invalidateQueries({ queryKey: eventKeys.all });
    onClose();
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(details) => {
        if (!details.open) handleClose();
      }}
      size="xl"
    >
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content maxW="800px" minH="600px">
            <Dialog.Header>
              <Dialog.Title>Plan: {goalTitle}</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <Text mb={3} color={subtitleColor} fontSize="sm">
                Chat with AI to break down your goal into actionable tasks.
              </Text>
              <Box minH="450px">
                <ChatboxComponent
                  name={`decompose-${goalId}`}
                  systemPrompt={systemPrompt}
                  summaryPrompt="Summarize the tasks we agreed on for this goal."
                  extraParams={extraParams}
                />
              </Box>
            </Dialog.Body>
            <Dialog.Footer>
              <Button onClick={handleClose}>Done</Button>
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
