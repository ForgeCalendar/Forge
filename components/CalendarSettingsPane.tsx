import { Box, Button, Text, Input, Flex } from "@chakra-ui/react";
import { useState, useEffect, useCallback } from "react";
import { useColorModeValue } from "./ui/color-mode";

type IcsSubscriptionRecord = {
  id: string;
  name: string;
  url: string;
  lastSynced: string | null;
};

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
  const subtitleColor = useColorModeValue("gray.600", "gray.300");
  const cardBorder = useColorModeValue("gray.200", "gray.700");
  const cardBg = useColorModeValue("gray.50", "gray.800");

  const [subscriptions, setSubscriptions] = useState<IcsSubscriptionRecord[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newName, setNewName] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [saving, setSaving] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editUrl, setEditUrl] = useState("");

  const [syncingId, setSyncingId] = useState<string | null>(null);

  const fetchSubscriptions = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/ics-subscriptions");
      if (!res.ok) throw new Error("Failed to fetch subscriptions");
      const data = await res.json();
      setSubscriptions(data);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load subscriptions",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubscriptions();
  }, [fetchSubscriptions]);

  async function handleAdd() {
    if (!newName.trim() || !newUrl.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/ics-subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), url: newUrl.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to add subscription");
      }
      setNewName("");
      setNewUrl("");
      await fetchSubscriptions();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add");
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate(id: string) {
    if (!editName.trim() && !editUrl.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const body: { name?: string; url?: string } = {};
      if (editName.trim()) body.name = editName.trim();
      if (editUrl.trim()) body.url = editUrl.trim();
      const res = await fetch(`/api/ics-subscriptions/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update subscription");
      }
      setEditingId(null);
      setEditName("");
      setEditUrl("");
      await fetchSubscriptions();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setError(null);
    try {
      const res = await fetch(`/api/ics-subscriptions/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete subscription");
      await fetchSubscriptions();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    }
  }

  async function handleSync(id: string) {
    setSyncingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/ics-subscriptions/${id}/sync`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to sync");
      }
      await fetchSubscriptions();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sync");
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
