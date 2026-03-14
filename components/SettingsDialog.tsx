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
import { useThemeTokens } from "@/lib/theme-tokens";
import { tagEditorPrompt } from "@/components/prompts";

function InfoTagSettingsPane() {
  const [selectedTag, setSelectedTag] = useState<
    typeof sampleInfoTags[number] | null
  >(null);
  const {
    textMuted: subtitleColor,
    bgSurface: cardBg,
    border: cardBorder,
    textSecondary: placeholderColor,
  } = useThemeTokens();
  const infoTextColor = subtitleColor;

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

type ProviderRecord = {
  id: string;
  type: string;
  name: string;
  baseUrl: string | null;
  apiKey: string;
  models: {
    id: string;
    modelId: string;
    name: string;
    isDefault: boolean;
  }[];
};

const providerTypeOptions = createListCollection({
  items: [
    { label: "Anthropic", value: "anthropic" },
    { label: "OpenAI", value: "openai" },
    { label: "Google", value: "google" },
    { label: "Mistral", value: "mistral" },
    { label: "OpenAI-Compatible (Self-hosted)", value: "openai-compatible" },
  ],
});

function providerTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    anthropic: "Anthropic",
    openai: "OpenAI",
    google: "Google",
    mistral: "Mistral",
    "openai-compatible": "Self-hosted (OpenAI-compatible)",
  };
  return labels[type] ?? type;
}

function maskKey(key: string): string {
  if (key.length <= 8) return "****";
  return key.slice(0, 4) + "..." + key.slice(-4);
}

function AccountSettingsPane() {
  const {
    textMuted: subtitleColor,
    border: cardBorder,
    bgCard: cardBg,
  } = useThemeTokens();

  const [providers, setProviders] = useState<ProviderRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newType, setNewType] = useState<string[]>([]);
  const [newName, setNewName] = useState("");
  const [newApiKey, setNewApiKey] = useState("");
  const [newBaseUrl, setNewBaseUrl] = useState("");
  const [saving, setSaving] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editApiKey, setEditApiKey] = useState("");
  const [editBaseUrl, setEditBaseUrl] = useState("");

  const fetchProviders = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/providers");
      if (!res.ok) throw new Error("Failed to fetch providers");
      const data: ProviderRecord[] = await res.json();
      setProviders(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load providers");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProviders();
  }, [fetchProviders]);

  async function handleAdd() {
    if (!newType[0] || !newApiKey.trim() || !newName.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: newType[0],
          name: newName.trim(),
          apiKey: newApiKey.trim(),
          ...(newType[0] === "openai-compatible" && newBaseUrl.trim()
            ? { baseUrl: newBaseUrl.trim() }
            : {}),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save provider");
      }
      setNewType([]);
      setNewName("");
      setNewApiKey("");
      setNewBaseUrl("");
      await fetchProviders();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate(id: string) {
    setSaving(true);
    setError(null);
    try {
      const body: Record<string, string> = {};
      if (editName.trim()) body.name = editName.trim();
      if (editApiKey.trim()) body.apiKey = editApiKey.trim();
      const provider = providers.find((p) => p.id === id);
      if (provider?.type === "openai-compatible") {
        body.baseUrl = editBaseUrl.trim();
      }

      const res = await fetch(`/api/providers/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update provider");
      }
      setEditingId(null);
      setEditName("");
      setEditApiKey("");
      setEditBaseUrl("");
      await fetchProviders();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setError(null);
    try {
      const res = await fetch(`/api/providers/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete provider");
      await fetchProviders();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    }
  }

  function startEditing(provider: ProviderRecord) {
    setEditingId(provider.id);
    setEditName(provider.name);
    setEditApiKey("");
    setEditBaseUrl(provider.baseUrl ?? "");
  }

  return (
    <Box>
      <Text fontWeight="semibold">Account</Text>
      <Text color={subtitleColor} mt={2}>
        Manage your AI providers and API keys.
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
        ) : providers.length === 0 ? (
          <Text color={subtitleColor} fontSize="sm">
            No providers configured. Add one below.
          </Text>
        ) : (
          providers.map((provider) => (
            <Box
              key={provider.id}
              p={3}
              mb={2}
              bg={cardBg}
              borderWidth="1px"
              borderColor={cardBorder}
              borderRadius="md"
            >
              {editingId === provider.id ? (
                <Box>
                  <Flex gap={2} mb={2}>
                    <Box flex={1}>
                      <Text fontSize="xs" mb={1}>
                        Name
                      </Text>
                      <Input
                        size="sm"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                      />
                    </Box>
                    <Box flex={1}>
                      <Text fontSize="xs" mb={1}>
                        API Key
                      </Text>
                      <Input
                        size="sm"
                        type="password"
                        placeholder="Leave blank to keep current"
                        value={editApiKey}
                        onChange={(e) => setEditApiKey(e.target.value)}
                      />
                    </Box>
                  </Flex>
                  {provider.type === "openai-compatible" && (
                    <Box mb={2}>
                      <Text fontSize="xs" mb={1}>
                        Base URL
                      </Text>
                      <Input
                        size="sm"
                        placeholder="https://your-server.com/v1"
                        value={editBaseUrl}
                        onChange={(e) => setEditBaseUrl(e.target.value)}
                      />
                    </Box>
                  )}
                  <Flex gap={2}>
                    <Button
                      size="sm"
                      onClick={() => handleUpdate(provider.id)}
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
                        setEditApiKey("");
                        setEditBaseUrl("");
                      }}
                    >
                      Cancel
                    </Button>
                  </Flex>
                </Box>
              ) : (
                <Flex justify="space-between" align="center">
                  <Box>
                    <Text fontWeight="medium" fontSize="sm">
                      {provider.name}
                    </Text>
                    <Text fontSize="xs" color={subtitleColor}>
                      {providerTypeLabel(provider.type)} &middot;{" "}
                      {maskKey(provider.apiKey)} &middot;{" "}
                      {provider.models.length} model
                      {provider.models.length !== 1 ? "s" : ""}
                    </Text>
                  </Box>
                  <Flex gap={2}>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => startEditing(provider)}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      colorPalette="red"
                      onClick={() => handleDelete(provider.id)}
                    >
                      Delete
                    </Button>
                  </Flex>
                </Flex>
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
          Add Provider
        </Text>
        <Flex gap={2} flexWrap="wrap" align="flex-end">
          <Box flex={1} minW="140px">
            <Text fontSize="xs" mb={1}>
              Type
            </Text>
            <Select.Root
              collection={providerTypeOptions}
              value={newType}
              onValueChange={(e) => setNewType(e.value)}
              size="sm"
            >
              <Select.Trigger>
                <Select.ValueText placeholder="Select type" />
              </Select.Trigger>
              <Select.Positioner>
                <Select.Content>
                  {providerTypeOptions.items.map((opt) => (
                    <Select.Item item={opt} key={opt.value}>
                      {opt.label}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Positioner>
            </Select.Root>
          </Box>
          <Box flex={1} minW="120px">
            <Text fontSize="xs" mb={1}>
              Name
            </Text>
            <Input
              size="sm"
              placeholder="My Anthropic"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
          </Box>
          <Box flex={2} minW="160px">
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
        </Flex>
        {newType[0] === "openai-compatible" && (
          <Box mt={2}>
            <Text fontSize="xs" mb={1}>
              Base URL
            </Text>
            <Input
              size="sm"
              placeholder="https://your-server.com/v1"
              value={newBaseUrl}
              onChange={(e) => setNewBaseUrl(e.target.value)}
            />
          </Box>
        )}
        <Button
          size="sm"
          mt={3}
          onClick={handleAdd}
          disabled={
            saving || !newType[0] || !newName.trim() || !newApiKey.trim()
          }
        >
          Add
        </Button>
      </Box>
    </Box>
  );
}

export default function SettingsDialog() {
  const {
    bgSurface: bodyBg,
    textMuted: subtitleColor,
    bgActiveMenu: menuBgActive,
  } = useThemeTokens();
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
