import {
  Box,
  Button,
  Text,
  Input,
  Select,
  createListCollection,
  Flex,
} from "@chakra-ui/react";
import { useState, useMemo } from "react";
import { useThemeTokens } from "@/lib/theme-tokens";
import {
  useUserQuery,
  useUpdateUserMutation,
  useSearchConfigQuery,
  useUpdateSearchConfigMutation,
} from "@/storage";
import { useProviders, type ProviderType } from "@/storage/secure/useProviders";

// Common IANA timezones grouped by region
const TIMEZONE_OPTIONS = [
  // Americas
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Anchorage",
  "America/Phoenix",
  "America/Toronto",
  "America/Vancouver",
  "America/Mexico_City",
  "America/Sao_Paulo",
  "America/Buenos_Aires",
  // Europe
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Rome",
  "Europe/Madrid",
  "Europe/Amsterdam",
  "Europe/Moscow",
  "Europe/Istanbul",
  // Asia
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Asia/Hong_Kong",
  "Asia/Singapore",
  "Asia/Seoul",
  "Asia/Kolkata",
  "Asia/Dubai",
  "Asia/Bangkok",
  "Asia/Jakarta",
  // Pacific
  "Pacific/Auckland",
  "Pacific/Sydney",
  "Australia/Melbourne",
  "Australia/Perth",
  "Pacific/Honolulu",
  // Africa
  "Africa/Cairo",
  "Africa/Johannesburg",
  "Africa/Lagos",
  // UTC
  "UTC",
];

function formatTimezoneLabel(tz: string): string {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      timeZoneName: "shortOffset",
    });
    const parts = formatter.formatToParts(now);
    const offset = parts.find((p) => p.type === "timeZoneName")?.value || "";
    // Convert "America/New_York" to "New York"
    const name = tz.split("/").pop()?.replace(/_/g, " ") || tz;
    return `${name} (${offset})`;
  } catch {
    return tz;
  }
}

type SearchConfigResponse = {
  hasTavilyApiKey: boolean;
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

function maskApiKey(key: string): string {
  if (key.length <= 8) return "****";
  return `${key.slice(0, 4)}...${key.slice(-4)}`;
}

export default function AccountSettingsPane() {
  const {
    textMuted: subtitleColor,
    border: cardBorder,
    bgCard: cardBg,
  } = useThemeTokens();

  // User data with TanStack Query
  const { data: userData, isLoading: timezoneLoading } = useUserQuery();
  const updateUserMutation = useUpdateUserMutation();

  const timezone = userData?.timezone || "UTC";
  const timezoneSaving = updateUserMutation.isPending;

  const timezoneOptions = useMemo(
    () =>
      createListCollection({
        items: TIMEZONE_OPTIONS.map((tz) => ({
          label: formatTimezoneLabel(tz),
          value: tz,
        })),
      }),
    []
  );

  async function handleTimezoneChange(newTimezone: string[]) {
    if (!newTimezone[0] || newTimezone[0] === timezone) return;
    try {
      await updateUserMutation.mutateAsync({ timezone: newTimezone[0] });
    } catch (err) {
      console.error("Failed to update timezone:", err);
    }
  }

  // Secure Providers (encrypted client-side)
  const { providers, loading, createProvider, updateProvider, deleteProvider } =
    useProviders();

  const { data: searchConfig, isLoading: searchLoading } =
    useSearchConfigQuery();
  const updateSearchConfigMutation = useUpdateSearchConfigMutation();

  const hasTavilyApiKey = searchConfig?.hasTavilyApiKey ?? false;

  const [newType, setNewType] = useState<string[]>(["anthropic"]);
  const [newName, setNewName] = useState("");
  const [newApiKey, setNewApiKey] = useState("");
  const [newBaseUrl, setNewBaseUrl] = useState("");
  const [searchEditing, setSearchEditing] = useState(!hasTavilyApiKey);
  const [tavilyApiKeyInput, setTavilyApiKeyInput] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editApiKey, setEditApiKey] = useState("");
  const [editBaseUrl, setEditBaseUrl] = useState("");
  const [status, setStatus] = useState<Record<string, string>>({});

  const searchSaving = updateSearchConfigMutation.isPending;

  async function handleAdd() {
    if (!newType[0] || !newName.trim() || !newApiKey.trim()) return;

    setStatus({ new: "Saving..." });
    const result = await createProvider({
      type: newType[0] as ProviderType,
      name: newName.trim(),
      apiKey: newApiKey.trim(),
      baseUrl:
        newType[0] === "openai-compatible" && newBaseUrl.trim()
          ? newBaseUrl.trim()
          : undefined,
    });

    if (result.success) {
      setStatus({ new: "Saved!" });
      setNewType(["anthropic"]);
      setNewName("");
      setNewApiKey("");
      setNewBaseUrl("");
      setTimeout(() => setStatus({}), 2000);
    } else {
      setStatus({ new: `Error: ${result.error}` });
    }
  }

  async function handleUpdate(id: string) {
    const provider = providers.find((p) => p.id === id);
    if (!provider) return;

    // Build updated data, keeping existing values if not changed
    const updatedData = {
      type: provider.type,
      name: editName.trim() || provider.name,
      apiKey: editApiKey.trim() || provider.apiKey,
      baseUrl:
        provider.type === "openai-compatible"
          ? editBaseUrl.trim() || provider.baseUrl
          : provider.baseUrl,
    };

    setStatus({ [id]: "Saving..." });
    const result = await updateProvider(id, updatedData);

    if (result.success) {
      setStatus({ [id]: "Saved!" });
      setEditingId(null);
      setEditName("");
      setEditApiKey("");
      setEditBaseUrl("");
      setTimeout(() => setStatus({}), 2000);
    } else {
      setStatus({ [id]: `Error: ${result.error}` });
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this provider? This cannot be undone.")) return;

    setStatus({ [id]: "Deleting..." });
    const result = await deleteProvider(id);

    if (result.success) {
      setStatus({ [id]: "Deleted!" });
      setTimeout(() => setStatus({}), 2000);
    } else {
      setStatus({ [id]: `Error: ${result.error}` });
    }
  }

  function startEditing(provider: {
    id: string;
    name: string;
    baseUrl?: string;
  }) {
    setEditingId(provider.id);
    setEditName(provider.name);
    setEditApiKey("");
    setEditBaseUrl(provider.baseUrl || "");
  }

  async function handleSearchUpdate() {
    if (!tavilyApiKeyInput.trim()) return;
    try {
      await updateSearchConfigMutation.mutateAsync({
        tavilyApiKey: tavilyApiKeyInput.trim(),
      });
      setSearchEditing(false);
      setTavilyApiKeyInput("");
    } catch (err) {
      console.error("Failed to update search config:", err);
    }
  }

  return (
    <Box>
      {/* Timezone Setting */}
      <Box
        p={4}
        borderRadius="md"
        borderWidth="1px"
        borderColor={cardBorder}
        bg={cardBg}
        mb={4}
      >
        <Text fontWeight="medium" fontSize="sm" mb={2}>
          Timezone
        </Text>
        <Select.Root
          collection={timezoneOptions}
          value={[timezone]}
          onValueChange={(e) => handleTimezoneChange(e.value)}
          size="sm"
          disabled={timezoneLoading || timezoneSaving}
        >
          <Select.Trigger>
            <Select.ValueText placeholder="Select timezone">
              {formatTimezoneLabel(timezone)}
            </Select.ValueText>
          </Select.Trigger>
          <Select.Content>
            {timezoneOptions.items.map((option) => (
              <Select.Item key={option.value} item={option}>
                {option.label}
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Root>
      </Box>

      {/* Search Configuration */}
      <Box
        p={4}
        borderRadius="md"
        borderWidth="1px"
        borderColor={cardBorder}
        bg={cardBg}
        mb={4}
      >
        <Text fontWeight="medium" fontSize="sm" mb={2}>
          Online Search (Tavily)
        </Text>
        {!searchEditing ? (
          <Box>
            <Text fontSize="xs" color={subtitleColor} mb={2}>
              {hasTavilyApiKey
                ? "API key configured ✓"
                : "No API key configured"}
            </Text>
            <Button
              size="sm"
              onClick={() => setSearchEditing(true)}
              variant="outline"
            >
              {hasTavilyApiKey ? "Update Key" : "Add Key"}
            </Button>
          </Box>
        ) : (
          <Box>
            <Input
              size="sm"
              type="password"
              placeholder="tvly-..."
              value={tavilyApiKeyInput}
              onChange={(e) => setTavilyApiKeyInput(e.target.value)}
              mb={2}
            />
            <Flex gap={2}>
              <Button
                size="sm"
                onClick={handleSearchUpdate}
                disabled={searchSaving || !tavilyApiKeyInput.trim()}
              >
                {searchSaving ? "Saving..." : "Save"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setSearchEditing(false);
                  setTavilyApiKeyInput("");
                }}
              >
                Cancel
              </Button>
            </Flex>
          </Box>
        )}
      </Box>

      {/* AI Providers */}
      <Box
        p={4}
        borderRadius="md"
        borderWidth="1px"
        borderColor={cardBorder}
        bg={cardBg}
        mb={4}
      >
        <Text fontWeight="medium" fontSize="sm" mb={2}>
          AI Providers
        </Text>
        <Text fontSize="xs" color={subtitleColor} mb={3}>
          All API keys are encrypted and stored on the server. Only you can
          decrypt them.
        </Text>

        {loading && <Text fontSize="xs">Loading providers...</Text>}

        {/* Existing Providers */}
        {providers.map((provider) => (
          <Box
            key={provider.id}
            p={3}
            mb={2}
            borderRadius="md"
            borderWidth="1px"
            borderColor={cardBorder}
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
                      placeholder={provider.name}
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
                      value={editBaseUrl}
                      onChange={(e) => setEditBaseUrl(e.target.value)}
                      placeholder="https://api.example.com/v1"
                    />
                  </Box>
                )}
                <Flex gap={2}>
                  <Button size="sm" onClick={() => handleUpdate(provider.id)}>
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
                {status[provider.id] && (
                  <Text fontSize="xs" color={subtitleColor} mt={2}>
                    {status[provider.id]}
                  </Text>
                )}
              </Box>
            ) : (
              <Flex justify="space-between" align="center">
                <Box>
                  <Text fontWeight="medium" fontSize="sm">
                    {provider.name}
                  </Text>
                  <Text fontSize="xs" color={subtitleColor}>
                    {providerTypeLabel(provider.type)} &middot;{" "}
                    {maskApiKey(provider.apiKey)}
                    {provider.baseUrl && ` • ${provider.baseUrl}`}
                  </Text>
                </Box>
                <Flex gap={2}>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => startEditing(provider)}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    colorScheme="red"
                    onClick={() => handleDelete(provider.id)}
                  >
                    Delete
                  </Button>
                </Flex>
              </Flex>
            )}
          </Box>
        ))}

        {/* Add New Provider */}
        <Box mt={4}>
          <Text fontWeight="medium" fontSize="sm" mb={2}>
            Add Provider
          </Text>
          <Flex gap={2} flexWrap="wrap" align="flex-end">
            <Box flex={1} minW="140px">
              <Text fontSize="xs" mb={1}>
                Provider Type
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
                <Select.Content>
                  {providerTypeOptions.items.map((option) => (
                    <Select.Item key={option.value} item={option}>
                      {option.label}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
            </Box>
            <Box flex={2} minW="160px">
              <Text fontSize="xs" mb={1}>
                Name
              </Text>
              <Input
                size="sm"
                placeholder="My Provider"
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
                placeholder="https://api.example.com/v1"
                value={newBaseUrl}
                onChange={(e) => setNewBaseUrl(e.target.value)}
              />
            </Box>
          )}
          <Button
            size="sm"
            mt={3}
            onClick={handleAdd}
            disabled={!newType[0] || !newName.trim() || !newApiKey.trim()}
          >
            Add
          </Button>
          {status.new && (
            <Text fontSize="xs" color={subtitleColor} mt={2}>
              {status.new}
            </Text>
          )}
        </Box>
      </Box>
    </Box>
  );
}
