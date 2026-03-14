import {
  Box,
  VStack,
  Text,
  Heading,
  Button,
  Input,
  Textarea,
  CloseButton,
  Dialog,
  Portal,
} from "@chakra-ui/react";
import { InfoTagComponent } from "./InfoTagComponent";
import WorkDialog from "./WorkDialog";
import type { Goal } from "../states/goals";
import type { GoalWithId, CreateGoalInput } from "@/storage/types";
import { useState, useRef } from "react";
import { useThemeTokens } from "@/lib/theme-tokens";

type Props = {
  goals: (Goal | GoalWithId)[];
  onAddGoal?: (g: CreateGoalInput) => void;
  onRemoveGoal?: (index: number) => void;
  onUpdateGoal?: (goal: GoalWithId) => void;
};

function DeleteGoalDialog({
  goalTitle,
  onDelete,
}: {
  goalTitle: string;
  onDelete: () => void;
}) {
  const { textMuted: dialogTextColor } = useThemeTokens();

  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <Button
          size="sm"
          variant="ghost"
          position="absolute"
          top={2}
          right={2}
          aria-label={`Remove ${goalTitle}`}
        >
          ✕
        </Button>
      </Dialog.Trigger>

      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>Delete goal?</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <Text color={dialogTextColor}>
                Are you sure you want to delete &quot;{goalTitle}&quot;? This
                action cannot be undone.
              </Text>
            </Dialog.Body>
            <Dialog.Footer>
              <Dialog.ActionTrigger asChild>
                <Button variant="ghost">Cancel</Button>
              </Dialog.ActionTrigger>
              <Dialog.ActionTrigger asChild>
                <Button
                  colorScheme="red"
                  onClick={() => {
                    onDelete();
                  }}
                >
                  Delete
                </Button>
              </Dialog.ActionTrigger>
              <Dialog.CloseTrigger asChild>
                <CloseButton size="sm" />
              </Dialog.CloseTrigger>
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

function formatDue(d: string | null) {
  if (!d) return null;
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return null;
  // Show both date and time (e.g. "Jan 15, 2026, 5:00 PM")
  try {
    return dt.toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    // Fallback for environments that don't support dateStyle/timeStyle
    return dt.toLocaleString();
  }
}

function GoalComponent({
  goal,
  onRemove,
  onUpdate,
}: {
  goal: Goal | GoalWithId;
  onRemove?: () => void;
  onUpdate?: () => void;
}) {
  const {
    bgCard: goalCardBg,
    textSecondary: metaTextColor,
    textMuted: bodyTextColor,
  } = useThemeTokens();

  // Type guard to check if goal has an id (is GoalWithId)
  const isGoalWithId = (g: Goal | GoalWithId): g is GoalWithId => {
    return "id" in g;
  };

  return (
    <Box p={3} bg={goalCardBg} borderRadius="md" position="relative">
      <DeleteGoalDialog
        goalTitle={goal.title}
        onDelete={() => {
          if (onRemove) onRemove();
        }}
      />

      <Text fontWeight="semibold">{goal.title}</Text>

      {goal.dueDate ? (
        <Text fontSize="sm" color={metaTextColor}>
          {formatDue(goal.dueDate)}
        </Text>
      ) : (
        <Text fontSize="sm" color={metaTextColor}>
          No due date
        </Text>
      )}

      <Text mt={2} fontSize="sm" color={bodyTextColor}>
        {goal.description}
      </Text>

      {goal.infoTags && goal.infoTags.length > 0 && (
        <Box mt={2} display="flex" gap={2} flexWrap="wrap">
          {goal.infoTags.map((t, idx) => (
            <Box key={`${goal.title}-info-${idx}`}>
              <InfoTagComponent tag={t} />
            </Box>
          ))}
        </Box>
      )}
      <Box mt={3} display="flex" gap={2}>
        {isGoalWithId(goal) ? (
          <>
            <WorkDialog goal={goal} />
            <Button size="sm" variant="outline" onClick={() => onUpdate?.()}>
              Update
            </Button>
          </>
        ) : (
          <Button size="sm" colorScheme="blue" disabled>
            Work! (Save goal first)
          </Button>
        )}
      </Box>
    </Box>
  );
}

export default function Sidebar({
  goals,
  onAddGoal,
  onRemoveGoal,
  onUpdateGoal,
}: Props) {
  const initialRef = useRef<HTMLInputElement | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueInput, setDueInput] = useState(""); // datetime-local value
  const {
    bgSurface: sidebarBg,
    border: sidebarBorder,
    textMuted: emptyStateColor,
  } = useThemeTokens();

  function resetForm() {
    setTitle("");
    setDescription("");
    setDueInput("");
  }

  function handleSubmit() {
    const dueDate = dueInput ? new Date(dueInput) : null;
    const goal: CreateGoalInput = {
      title: title || "Untitled Goal",
      description: description || "",
      dueDate: dueDate ? dueDate.toISOString() : null,
      events: [],
      infoTags: [],
    };
    if (onAddGoal) onAddGoal(goal);
    resetForm();
    // Dialog.CloseTrigger will close the dialog when used as child
  }

  return (
    <Box
      as="aside"
      w={{ base: "100%", md: "350px", lg: "600px" }}
      bg={sidebarBg}
      borderRightWidth={{ base: 0, md: "1px" }}
      borderBottomWidth={{ base: "1px", md: 0 }}
      borderRightColor={sidebarBorder}
      borderBottomColor={sidebarBorder}
      p={4}
      flexShrink={0}
      height="100%"
      minHeight={0}
      overflowY="auto"
    >
      <VStack align="stretch" gap={3}>
        <Heading as="h2" size="md">
          Goals
        </Heading>

        {goals.length === 0 ? (
          <Text color={emptyStateColor}>No goals yet</Text>
        ) : (
          goals.map((g, i) => (
            <GoalComponent
              key={"id" in g ? g.id : `${g.title}-${i}`}
              goal={g}
              onRemove={() => {
                if (onRemoveGoal) onRemoveGoal(i);
              }}
              onUpdate={() => {
                if (onUpdateGoal && "id" in g) {
                  onUpdateGoal(g as GoalWithId);
                }
              }}
            />
          ))
        )}

        {/* Bottom add button using Chakra Dialog */}
        <Box pt={2}>
          <Dialog.Root>
            <Dialog.Trigger asChild>
              <Button width="100%">+ Add Goal</Button>
            </Dialog.Trigger>

            <Portal>
              <Dialog.Backdrop />
              <Dialog.Positioner>
                <Dialog.Content>
                  <Dialog.Header>
                    <Dialog.Title>Create Goal</Dialog.Title>
                  </Dialog.Header>

                  <Dialog.Body>
                    <Box>
                      <Text fontSize="sm" mb={1}>
                        Title
                      </Text>
                      <Input
                        ref={initialRef}
                        placeholder="Goal title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                      />
                    </Box>

                    <Box mt={4}>
                      <Text fontSize="sm" mb={1}>
                        Description
                      </Text>
                      <Textarea
                        placeholder="Short description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                      />
                    </Box>

                    <Box mt={4}>
                      <Text fontSize="sm" mb={1}>
                        Due date & time
                      </Text>
                      <Input
                        type="datetime-local"
                        value={dueInput}
                        onChange={(e) => setDueInput(e.target.value)}
                      />
                    </Box>
                  </Dialog.Body>

                  <Dialog.Footer>
                    <Dialog.ActionTrigger asChild>
                      <Button variant="ghost">Cancel</Button>
                    </Dialog.ActionTrigger>
                    <Dialog.ActionTrigger asChild>
                      <Button onClick={handleSubmit}>Create</Button>
                    </Dialog.ActionTrigger>
                  </Dialog.Footer>

                  <Dialog.CloseTrigger asChild>
                    <CloseButton size="sm" />
                  </Dialog.CloseTrigger>
                </Dialog.Content>
              </Dialog.Positioner>
            </Portal>
          </Dialog.Root>
        </Box>
      </VStack>
    </Box>
  );
}
