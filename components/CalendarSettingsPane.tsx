import { Box, Button, Text, Input, Flex } from "@chakra-ui/react";
import { useState } from "react";
import { useThemeTokens } from "../lib/theme-tokens";
import {
  useIcsSubscriptionsQuery,
  useCreateIcsSubscriptionMutation,
  useUpdateIcsSubscriptionMutation,
  useDeleteIcsSubscriptionMutation,
  useSyncIcsSubscriptionMutation,
} from "@/storage";

function maskUrl(url: string): string {
  try {
    const { hostname } = new URL(url);
    const lastFour = url.slice(-4);
    return `${hostname}/***${lastFour}`;
  } catch {
    if (url.length <= 12) return url;
    return url.slice(0, 8) + "***" + url.slice(-4);
  }
}

export default function CalendarSettingsPane() {
  const {
    textMuted: subtitleColor,
    border: cardBorder,
    bgCard: cardBg,
  } = useThemeTokens();

  // TanStack Query hooks
  const {
    data: subscriptions = [],
    isLoading: loading,
    error: queryError,
  } = useIcsSubscriptionsQuery();
  const createSubscriptionMutation = useCreateIcsSubscriptionMutation();
  const updateSubscriptionMutation = useUpdateIcsSubscriptionMutation();
  const deleteSubscriptionMutation = useDeleteIcsSubscriptionMutation();
  const syncSubscriptionMutation = useSyncIcsSubscriptionMutation();

  const error = queryError ? String(queryError) : null;

  const [newName, setNewName] = useState("");
  const [newUrl, setNewUrl] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editUrl, setEditUrl] = useState("");

  const [syncingId, setSyncingId] = useState<string | null>(null);

  const saving =
    createSubscriptionMutation.isPending ||
    updateSubscriptionMutation.isPending;

  async function handleAdd() {
    if (!newName.trim() || !newUrl.trim()) return;
    try {
      await createSubscriptionMutation.mutateAsync({
        name: newName.trim(),
        url: newUrl.trim(),
      });
      setNewName("");
      setNewUrl("");
    } catch (err) {
      console.error("Failed to add subscription:", err);
    }
  }

  async function handleUpdate(id: string) {
    if (!editName.trim() && !editUrl.trim()) return;
    try {
      const input: { name?: string; url?: string } = {};
      if (editName.trim()) input.name = editName.trim();
      if (editUrl.trim()) input.url = editUrl.trim();

      await updateSubscriptionMutation.mutateAsync({ id, input });
      setEditingId(null);
      setEditName("");
      setEditUrl("");
    } catch (err) {
      console.error("Failed to update subscription:", err);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteSubscriptionMutation.mutateAsync(id);
    } catch (err) {
      console.error("Failed to delete subscription:", err);
    }
  }

  async function handleSync(id: string) {
    setSyncingId(id);
    try {
      await syncSubscriptionMutation.mutateAsync(id);
    } catch (err) {
      console.error("Failed to sync subscription:", err);
    } finally {
      setSyncingId(null);
    }
  }

  return (
    <Box>
      <Text fontWeight="semibold">Calendars</Text>
      <Text color={subtitleColor} mt={2}>
        Manage your ICS calendar subscriptions.
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
        ) : subscriptions.length === 0 ? (
          <Text color={subtitleColor} fontSize="sm">
            No calendar subscriptions. Add one below.
          </Text>
        ) : (
          subscriptions.map((sub) => (
            <Box
              key={sub.id}
              p={3}
              mb={2}
              bg={cardBg}
              borderWidth="1px"
              borderColor={cardBorder}
              borderRadius="md"
            >
              <Flex justify="space-between" align="center">
                <Box>
                  <Text fontWeight="medium" fontSize="sm">
                    {sub.name}
                  </Text>
                  <Text fontSize="xs" color={subtitleColor}>
                    {maskUrl(sub.url)}
                  </Text>
                  {sub.lastSynced && (
                    <Text fontSize="xs" color={subtitleColor}>
                      Last synced: {new Date(sub.lastSynced).toLocaleString()}
                    </Text>
                  )}
                </Box>
                <Flex gap={2}>
                  {editingId === sub.id ? (
                    <>
                      <Input
                        size="sm"
                        width="120px"
                        placeholder="Name"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                      />
                      <Input
                        size="sm"
                        width="200px"
                        placeholder="URL"
                        value={editUrl}
                        onChange={(e) => setEditUrl(e.target.value)}
                      />
                      <Button
                        size="sm"
                        onClick={() => handleUpdate(sub.id)}
                        disabled={saving}
                      >
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingId(null);
                          setEditName("");
                          setEditUrl("");
                        }}
                      >
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSync(sub.id)}
                        disabled={syncingId === sub.id}
                      >
                        {syncingId === sub.id ? "Syncing..." : "Sync"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingId(sub.id);
                          setEditName(sub.name);
                          setEditUrl(sub.url);
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        colorPalette="red"
                        onClick={() => handleDelete(sub.id)}
                      >
                        Delete
                      </Button>
                    </>
                  )}
                </Flex>
              </Flex>
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
          Add Calendar Subscription
        </Text>
        <Flex gap={2} align="flex-end">
          <Box flex={1}>
            <Text fontSize="xs" mb={1}>
              Name
            </Text>
            <Input
              size="sm"
              placeholder="Work Calendar"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
          </Box>
          <Box flex={2}>
            <Text fontSize="xs" mb={1}>
              ICS URL
            </Text>
            <Input
              size="sm"
              placeholder="https://calendar.google.com/..."
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
            />
          </Box>
          <Button
            size="sm"
            onClick={handleAdd}
            disabled={saving || !newName.trim() || !newUrl.trim()}
          >
            Add
          </Button>
        </Flex>
      </Box>
    </Box>
  );
}
