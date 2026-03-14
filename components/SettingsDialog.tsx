import {
  Box,
  Button,
  Dialog,
  Portal,
  Heading,
  Text,
  Input,
  Select,
  createListCollection,
  Flex,
} from "@chakra-ui/react";
import SettingsButton from "./SettingsButton";
import { useState, useEffect, useCallback } from "react";
import { sampleInfoTags } from "../states/InfoTag";
import { InfoTagComponent } from "./InfoTagComponent";
import { ChatboxComponent } from "@/components/Chatbox";
import { useColorModeValue } from "@/components/ui/color-mode";
import { tagEditorPrompt } from "@/components/prompts";

function InfoTagSettingsPane() {
  const [selectedTag, setSelectedTag] = useState<
    (typeof sampleInfoTags)[number] | null
  >(null);
  const subtitleColor = useColorModeValue("gray.600", "gray.300");
  const cardBg = useColorModeValue("white", "gray.900");
  const cardBorder = useColorModeValue("gray.200", "gray.700");
  const infoTextColor = useColorModeValue("gray.600", "gray.300");
  const placeholderColor = useColorModeValue("gray.500", "gray.400");

  return (
    <Box>
      <Text fontWeight="semibold">Info Tags</Text>
      <Text color={subtitleColor} mt={2}>
        Manage and customize your information tags.
      </Text>

      <Box
        mt={6}
        display="flex"
        flexDirection={{ base: "column", md: "row" }}
        gap={6}
      >
        <Box flex={1}>
          <Text fontWeight="medium" mb={3}>
            Available Tags
          </Text>
          <Box display="flex" gap={2} flexWrap="wrap">
            {sampleInfoTags.map((tag) => (
              <Box key={tag.title}>
                <InfoTagComponent
                  tag={tag}
                  onClick={() => setSelectedTag(tag)}
                />
              </Box>
            ))}
          </Box>
        </Box>

        <Box flex={1} minH="420px">
          <Box
            borderWidth="1px"
            borderColor={cardBorder}
            borderRadius="lg"
            bg={cardBg}
            p={4}
            height="100%"
            display="flex"
            flexDirection="column"
            minH="420px"
          >
            {selectedTag ? (
              <>
                <Heading as="h3" size="md">
                  {selectedTag.title}
                </Heading>
                <Text color={infoTextColor} mt={2}>
                  {selectedTag.info}
                </Text>
                <Box
                  mt={4}
                  flex={1}
                  minH="0"
                  display="flex"
                  flexDirection="column"
                >
                  <ChatboxComponent
                    name={selectedTag.title}
                    systemPrompt={tagEditorPrompt(selectedTag.title)}
                    summaryPrompt={
                      "Please summarize the key points about " +
                      selectedTag.title +
                      " from our conversation."
                    }
                  />
                </Box>
              </>
            ) : (
              <Box
                flex={1}
                display="flex"
                alignItems="center"
                justifyContent="center"
              >
                <Text color={placeholderColor}>
                  Select a tag to view details and chat.
                </Text>
              </Box>
            )}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

type ApiKeyRecord = {
  id: string;
  provider: string;
  apiKey: string;
  name: string | null;
};

const providerOptions = createListCollection({
  items: [
    { label: "Anthropic", value: "ANTHROPIC" },
    { label: "OpenAI", value: "OPENAI" },
    { label: "Google", value: "GOOGLE" },
    { label: "Mistral", value: "MISTRAL" },
    { label: "Cohere", value: "COHERE" },
  ],
});

function AccountSettingsPane() {
  const subtitleColor = useColorModeValue("gray.600", "gray.300");
  const cardBorder = useColorModeValue("gray.200", "gray.700");
  const cardBg = useColorModeValue("gray.50", "gray.800");

  const [apiKeys, setApiKeys] = useState<ApiKeyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state for adding a new key
  const [newProvider, setNewProvider] = useState<string[]>([]);
  const [newApiKey, setNewApiKey] = useState("");
  const [saving, setSaving] = useState(false);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editApiKey, setEditApiKey] = useState("");

  const fetchKeys = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/ai-agent-api-keys");
      if (!res.ok) throw new Error("Failed to fetch API keys");
      const data = await res.json();
      setApiKeys(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load API keys");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  async function handleAdd() {
    if (!newProvider[0] || !newApiKey.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/ai-agent-api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: newProvider[0],
          apiKey: newApiKey.trim(),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save API key");
      }
      setNewProvider([]);
      setNewApiKey("");
      await fetchKeys();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate(id: string) {
    if (!editApiKey.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/ai-agent-api-keys/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: editApiKey.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update API key");
      }
      setEditingId(null);
      setEditApiKey("");
      await fetchKeys();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setError(null);
    try {
      const res = await fetch(`/api/ai-agent-api-keys/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete API key");
      await fetchKeys();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    }
  }

  function maskKey(key: string) {
    if (key.length <= 8) return "****";
    return key.slice(0, 4) + "..." + key.slice(-4);
  }

  return (
    <Box>
      <Text fontWeight="semibold">Account</Text>
      <Text color={subtitleColor} mt={2}>
        Manage your AI provider API keys.
      </Text>

      {error && (
        <Text color="red.500" mt={2} fontSize="sm">
          {error}
        </Text>
      )}

      {/* Existing keys */}
      <Box mt={4}>
        {loading ? (
          <Text color={subtitleColor} fontSize="sm">
            Loading...
          </Text>
        ) : apiKeys.length === 0 ? (
          <Text color={subtitleColor} fontSize="sm">
            No API keys configured. Add one below.
          </Text>
        ) : (
          apiKeys.map((key) => (
            <Box
              key={key.id}
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
                    {key.provider}
                  </Text>
                  <Text fontSize="xs" color={subtitleColor}>
                    {maskKey(key.apiKey)}
                  </Text>
                </Box>
                <Flex gap={2}>
                  {editingId === key.id ? (
                    <>
                      <Input
                        size="sm"
                        width="200px"
                        type="password"
                        placeholder="New API key"
                        value={editApiKey}
                        onChange={(e) => setEditApiKey(e.target.value)}
                      />
                      <Button
                        size="sm"
                        onClick={() => handleUpdate(key.id)}
                        disabled={saving}
                      >
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingId(null);
                          setEditApiKey("");
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
                        onClick={() => {
                          setEditingId(key.id);
                          setEditApiKey("");
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        colorPalette="red"
                        onClick={() => handleDelete(key.id)}
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

      {/* Add new key form */}
      <Box
        mt={4}
        p={3}
        borderWidth="1px"
        borderColor={cardBorder}
        borderRadius="md"
      >
        <Text fontWeight="medium" fontSize="sm" mb={2}>
          Add API Key
        </Text>
        <Flex gap={2} align="flex-end">
          <Box flex={1}>
            <Text fontSize="xs" mb={1}>
              Provider
            </Text>
            <Select.Root
              collection={providerOptions}
              value={newProvider}
              onValueChange={(e) => setNewProvider(e.value)}
              size="sm"
            >
              <Select.Trigger>
                <Select.ValueText placeholder="Select provider" />
              </Select.Trigger>
              <Select.Positioner>
                <Select.Content>
                  {providerOptions.items.map((opt) => (
                    <Select.Item item={opt} key={opt.value}>
                      {opt.label}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Positioner>
            </Select.Root>
          </Box>
          <Box flex={2}>
            <Text fontSize="xs" mb={1}>
              API Key
            </Text>
            <Input
              size="sm"
              type="password"
              placeholder="sk-..."
              value={newApiKey}
              onChange={(e) => setNewApiKey(e.target.value)}
            />
          </Box>
          <Button
            size="sm"
            onClick={handleAdd}
            disabled={saving || !newProvider[0] || !newApiKey.trim()}
          >
            Add
          </Button>
        </Flex>
      </Box>
    </Box>
  );
}

type IcsSubscriptionRecord = {
  id: string;
  name: string;
  url: string;
  lastSynced: string | null;
};

function CalendarSettingsPane() {
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

export default function SettingsDialog() {
  const bodyBg = useColorModeValue("white", "gray.900");
  const subtitleColor = useColorModeValue("gray.600", "gray.300");
  const menuBgActive = useColorModeValue("gray.100", "gray.700");
  const menuBg = "transparent";

  const panes = {
    General: (
      <Box>
        <Text fontWeight="semibold">General</Text>
        <Text color={subtitleColor} mt={2}>
          Basic application preferences and behavior.
        </Text>
      </Box>
    ),
    InformationTags: <InfoTagSettingsPane />,
    Appearance: (
      <Box>
        <Text fontWeight="semibold">Appearance</Text>
        <Text color={subtitleColor} mt={2}>
          Theme, density and other UI preferences.
        </Text>
      </Box>
    ),
    Notifications: (
      <Box>
        <Text fontWeight="semibold">Notifications</Text>
        <Text color={subtitleColor} mt={2}>
          Configure notification preferences and integrations.
        </Text>
      </Box>
    ),
    Calendars: <CalendarSettingsPane />,
    Account: <AccountSettingsPane />,
  };

  const [selected, setSelected] = useState("General" as keyof typeof panes);
  const menuItems = Object.keys(panes) as Array<keyof typeof panes>;

  return (
    <Dialog.Root size="lg">
      <Dialog.Trigger asChild>
        <SettingsButton />
      </Dialog.Trigger>

      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content maxW="960px" bg={bodyBg}>
            <Dialog.Header>
              <Dialog.Title>Settings</Dialog.Title>
            </Dialog.Header>

            <Dialog.Body>
              {/* Two-column layout: left menu and right content */}
              <Box display="flex" gap={6} p={3} minWidth="600px">
                <Box width="200px" flexShrink={0}>
                  <Box as="nav">
                    {menuItems.map((item) => (
                      <Button
                        key={item}
                        variant="ghost"
                        justifyContent="flex-start"
                        width="100%"
                        mb={1}
                        bg={item === selected ? menuBgActive : menuBg}
                        onClick={() => setSelected(item)}
                      >
                        {item}
                      </Button>
                    ))}
                  </Box>
                </Box>

                <Box flex={1}>{panes[selected] ?? null}</Box>
              </Box>
            </Dialog.Body>

            <Dialog.Footer>
              <Dialog.ActionTrigger asChild>
                <Button variant="ghost">Cancel</Button>
              </Dialog.ActionTrigger>
              <Dialog.ActionTrigger asChild>
                <Button colorScheme="blue">Save</Button>
              </Dialog.ActionTrigger>
            </Dialog.Footer>

            <Dialog.CloseTrigger asChild>
              {/* close icon already inside content via CloseTrigger if desired */}
              <Button aria-hidden style={{ display: "none" }} />
            </Dialog.CloseTrigger>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
