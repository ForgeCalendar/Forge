import {
  Box,
  Button,
  CloseButton,
  Dialog,
  Portal,
  Text,
} from "@chakra-ui/react";
import { ChatboxComponent } from "@/components/Chatbox";
import { useQueryClient } from "@tanstack/react-query";
import { goalKeys } from "@/storage/useGoalsQuery";
import { eventKeys } from "@/storage/useEventsQuery";
import { chatHistoryKeys } from "@/storage/useChatHistoryQuery";
import { useMemo } from "react";
import { useThemeTokens } from "@/lib/theme-tokens";

type Props = {
  goalId: string;
  goalTitle: string;
  goalDescription: string;
  dueDate: string | null;
  chatHistoryId: string;
  open: boolean;
  onClose: () => void;
  mode?: "create" | "update";
};

export default function GoalDecomposeDialog({
  goalId,
  goalTitle,
  goalDescription,
  dueDate,
  chatHistoryId,
  open,
  onClose,
  mode = "create",
}: Props) {
  const queryClient = useQueryClient();
  const { textSecondary: subtitleColor } = useThemeTokens();

  const isUpdate = mode === "update";

  const extraParams = useMemo(() => ({ chatHistoryId }), [chatHistoryId]);

  function handleClose() {
    queryClient.invalidateQueries({ queryKey: goalKeys.all });
    queryClient.invalidateQueries({ queryKey: eventKeys.all });
    queryClient.invalidateQueries({
      queryKey: chatHistoryKeys.detail(chatHistoryId),
    });
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
                <ChatboxComponent
                  name={`decompose-${goalId}`}
                  chatHistoryId={chatHistoryId}
                  extraParams={extraParams}
                  initialMessage={
                    isUpdate
                      ? undefined
                      : "Break down this goal into tasks and save them to my calendar."
                  }
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
