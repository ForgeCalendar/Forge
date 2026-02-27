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
import {
  useChatHistoryQuery,
  chatHistoryKeys,
} from "@/storage/useChatHistoryQuery";
import { useMemo } from "react";
import { useColorModeValue } from "@/components/ui/color-mode";

type Props = {
  goalId: string;
  goalTitle: string;
  goalDescription: string;
  dueDate: string | null;
  open: boolean;
  onClose: () => void;
  mode?: "create" | "update";
};

export default function GoalDecomposeDialog({
  goalId,
  goalTitle,
  goalDescription,
  dueDate,
  open,
  onClose,
  mode = "create",
}: Props) {
  const queryClient = useQueryClient();
  const subtitleColor = useColorModeValue("gray.500", "gray.400");

  const isUpdate = mode === "update";
  const { data: chatHistory, isLoading: historyLoading } = useChatHistoryQuery(
    isUpdate && open ? goalId : null
  );

  const systemPrompt = useMemo(
    () => goalDecomposePrompt(goalTitle, goalDescription, dueDate),
    [goalTitle, goalDescription, dueDate]
  );

  const extraParams = useMemo(() => ({ goalId }), [goalId]);

  const hasHistory = isUpdate && chatHistory && chatHistory.length > 0;

  function handleClose() {
    queryClient.invalidateQueries({ queryKey: goalKeys.all });
    queryClient.invalidateQueries({ queryKey: eventKeys.all });
    queryClient.invalidateQueries({ queryKey: chatHistoryKeys.detail(goalId) });
    onClose();
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(details) => {
        if (!details.open) handleClose();
      }}
      size="xl"
      lazyMount
      unmountOnExit
    >
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content
            maxW="800px"
            maxH="80vh"
            display="flex"
            flexDirection="column"
          >
            <Dialog.Header flexShrink={0}>
              <Dialog.Title>
                {isUpdate ? "Update" : "Plan"}: {goalTitle}
              </Dialog.Title>
            </Dialog.Header>
            <Dialog.Body
              flex={1}
              overflow="hidden"
              display="flex"
              flexDirection="column"
            >
              <Text mb={3} color={subtitleColor} fontSize="sm" flexShrink={0}>
                {isUpdate
                  ? "Continue your conversation to update tasks for this goal."
                  : "Chat with AI to break down your goal into actionable tasks."}
              </Text>
              <Box
                flex={1}
                overflow="hidden"
                minH={0}
                display="flex"
                flexDirection="column"
              >
                {isUpdate && historyLoading ? (
                  <Text color={subtitleColor}>Loading conversation...</Text>
                ) : (
                  <ChatboxComponent
                    name={`decompose-${goalId}`}
                    systemPrompt={systemPrompt}
                    summaryPrompt="Summarize the tasks we agreed on for this goal."
                    extraParams={extraParams}
                    initialMessage={
                      hasHistory
                        ? undefined
                        : "Break down this goal into tasks and save them to my calendar."
                    }
                    initialMessages={hasHistory ? chatHistory : undefined}
                  />
                )}
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
