import { Box, Button, Text, Input, Textarea, Flex } from "@chakra-ui/react";
import { useState } from "react";
import { useThemeTokens } from "@/lib/theme-tokens";
import {
  useMemoriesQuery,
  useCreateMemoryMutation,
  useUpdateMemoryMutation,
  useDeleteMemoryMutation,
} from "@/storage";

export default function MemorySettingsPane() {
  const {
    textMuted: subtitleColor,
    border: cardBorder,
    bgCard: cardBg,
  } = useThemeTokens();

  // TanStack Query hooks
  const {
    data: memories = [],
    isLoading: loading,
    error: queryError,
  } = useMemoriesQuery();
  const createMemoryMutation = useCreateMemoryMutation();
  const updateMemoryMutation = useUpdateMemoryMutation();
  const deleteMemoryMutation = useDeleteMemoryMutation();

  const error = queryError ? String(queryError) : null;

  const [newQuestion, setNewQuestion] = useState("");
  const [newAnswer, setNewAnswer] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editQuestion, setEditQuestion] = useState("");
  const [editAnswer, setEditAnswer] = useState("");

  const saving =
    createMemoryMutation.isPending || updateMemoryMutation.isPending;

  async function handleAdd() {
    if (!newQuestion.trim() || !newAnswer.trim()) return;
    try {
      await createMemoryMutation.mutateAsync({
        question: newQuestion.trim(),
        answer: newAnswer.trim(),
      });
      setNewQuestion("");
      setNewAnswer("");
    } catch (err) {
      console.error("Failed to save memory:", err);
    }
  }

  async function handleUpdate(id: string) {
    try {
      const input: Record<string, string> = {};
      if (editQuestion.trim()) input.question = editQuestion.trim();
      if (editAnswer.trim()) input.answer = editAnswer.trim();

      await updateMemoryMutation.mutateAsync({ id, input });
      setEditingId(null);
      setEditQuestion("");
      setEditAnswer("");
    } catch (err) {
      console.error("Failed to update memory:", err);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteMemoryMutation.mutateAsync(id);
    } catch (err) {
      console.error("Failed to delete memory:", err);
    }
  }

  function startEditing(memory: {
    id: string;
    question: string;
    answer: string;
  }) {
    setEditingId(memory.id);
    setEditQuestion(memory.question);
    setEditAnswer(memory.answer);
  }

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  return (
    <Box>
      <Text fontWeight="semibold">Memory</Text>
      <Text color={subtitleColor} mt={2}>
        Manage what the AI remembers about you. These memories help personalize
        your conversations.
      </Text>

      {error && (
        <Text color="red.500" mt={2} fontSize="sm">
          {error}
        </Text>
      )}

      <Box mt={4}>
        {loading ? (
          <Text color={subtitleColor} fontSize="sm">
            Loading...
          </Text>
        ) : memories.length === 0 ? (
          <Text color={subtitleColor} fontSize="sm">
            No memories stored yet. Add one below or chat with the AI to build
            memories automatically.
          </Text>
        ) : (
          memories.map((memory) => (
            <Box
              key={memory.id}
              p={3}
              mb={2}
              bg={cardBg}
              borderWidth="1px"
              borderColor={cardBorder}
              borderRadius="md"
            >
              {editingId === memory.id ? (
                <Box>
                  <Box mb={2}>
                    <Text fontSize="xs" mb={1}>
                      Question
                    </Text>
                    <Input
                      size="sm"
                      value={editQuestion}
                      onChange={(e) => setEditQuestion(e.target.value)}
                    />
                  </Box>
                  <Box mb={2}>
                    <Text fontSize="xs" mb={1}>
                      Answer
                    </Text>
                    <Textarea
                      size="sm"
                      value={editAnswer}
                      onChange={(e) => setEditAnswer(e.target.value)}
                      rows={3}
                    />
                  </Box>
                  <Flex gap={2}>
                    <Button
                      size="sm"
                      onClick={() => handleUpdate(memory.id)}
                      disabled={saving}
                    >
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditingId(null);
                        setEditQuestion("");
                        setEditAnswer("");
                      }}
                    >
                      Cancel
                    </Button>
                  </Flex>
                </Box>
              ) : (
                <Box>
                  <Flex justify="space-between" align="flex-start">
                    <Box flex={1} mr={4}>
                      <Text fontWeight="medium" fontSize="sm">
                        {memory.question}
                      </Text>
                      <Text fontSize="sm" mt={1}>
                        {memory.answer}
                      </Text>
                      <Text fontSize="xs" color={subtitleColor} mt={2}>
                        Updated {formatDate(memory.updatedAt)}
                      </Text>
                    </Box>
                    <Flex gap={2} flexShrink={0}>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => startEditing(memory)}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        colorPalette="red"
                        onClick={() => handleDelete(memory.id)}
                      >
                        Delete
                      </Button>
                    </Flex>
                  </Flex>
                </Box>
              )}
            </Box>
          ))
        )}
      </Box>

      <Box
        mt={4}
        p={3}
        borderWidth="1px"
        borderColor={cardBorder}
        borderRadius="md"
      >
        <Text fontWeight="medium" fontSize="sm" mb={2}>
          Add Memory
        </Text>
        <Box mb={2}>
          <Text fontSize="xs" mb={1}>
            Question
          </Text>
          <Input
            size="sm"
            placeholder="e.g., What is your occupation?"
            value={newQuestion}
            onChange={(e) => setNewQuestion(e.target.value)}
          />
        </Box>
        <Box mb={2}>
          <Text fontSize="xs" mb={1}>
            Answer
          </Text>
          <Textarea
            size="sm"
            placeholder="e.g., I'm a software engineer"
            value={newAnswer}
            onChange={(e) => setNewAnswer(e.target.value)}
            rows={2}
          />
        </Box>
        <Button
          size="sm"
          onClick={handleAdd}
          disabled={saving || !newQuestion.trim() || !newAnswer.trim()}
        >
          Add
        </Button>
      </Box>
    </Box>
  );
}
