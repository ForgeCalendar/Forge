import {
  Box,
  Button,
  Text,
  Input,
  Select,
  createListCollection,
  Flex,
} from "@chakra-ui/react";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useThemeTokens } from "@/lib/theme-tokens";

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

function maskKey(key: string): string {
  if (key.length <= 8) return "****";
  return key.slice(0, 4) + "..." + key.slice(-4);
}

export default function AccountSettingsPane() {
  const {
    textMuted: subtitleColor,
    border: cardBorder,
    bgCard: cardBg,
  } = useThemeTokens();

  // Timezone state
  const [timezone, setTimezone] = useState<string>("UTC");
  const [timezoneLoading, setTimezoneLoading] = useState(true);
  const [timezoneSaving, setTimezoneSaving] = useState(false);

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

  const fetchUserSettings = useCallback(async () => {
    try {
      setTimezoneLoading(true);
      const res = await fetch("/api/user");
      if (res.ok) {
        const data = await res.json();
        setTimezone(data.timezone || "UTC");
      }
    } catch (err) {
      console.error("Failed to fetch user settings:", err);
    } finally {
      setTimezoneLoading(false);
    }
  }, []);

  async function handleTimezoneChange(newTimezone: string[]) {
    if (!newTimezone[0] || newTimezone[0] === timezone) return;
    setTimezoneSaving(true);
    try {
      const res = await fetch("/api/user", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timezone: newTimezone[0] }),
      });
      if (res.ok) {
        setTimezone(newTimezone[0]);
      }
    } catch (err) {
      console.error("Failed to update timezone:", err);
    } finally {
      setTimezoneSaving(false);
    }
  }

  const [providers, setProviders] = useState<ProviderRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newType, setNewType] = useState<string[]>([]);
  const [newName, setNewName] = useState("");
  const [newApiKey, setNewApiKey] = useState("");
  const [newBaseUrl, setNewBaseUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [searchSaving, setSearchSaving] = useState(false);
  const [searchLoading, setSearchLoading] = useState(true);
  const [hasTavilyApiKey, setHasTavilyApiKey] = useState(false);
  const [searchEditing, setSearchEditing] = useState(false);
  const [tavilyApiKeyInput, setTavilyApiKeyInput] = useState("");

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

  const fetchSearchConfig = useCallback(async () => {
    try {
      setSearchLoading(true);
      const res = await fetch("/api/search-config");
      if (!res.ok) throw new Error("Failed to fetch search config");
      const data: SearchConfigResponse = await res.json();
      setHasTavilyApiKey(data.hasTavilyApiKey);
      setSearchEditing(!data.hasTavilyApiKey);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load search config"
      );
    } finally {
      setSearchLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProviders();
    fetchUserSettings();
    fetchSearchConfig();
  }, [fetchProviders, fetchUserSettings, fetchSearchConfig]);

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

  async function handleSaveSearchConfig() {
    setSearchSaving(true);
    setError(null);
    try {
      const payload: Record<string, string> = {
        tavilyApiKey: tavilyApiKeyInput.trim(),
      };

      const res = await fetch("/api/search-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save search config");
      }

      const data: SearchConfigResponse = await res.json();
      setHasTavilyApiKey(data.hasTavilyApiKey);
      setSearchEditing(false);
      setTavilyApiKeyInput("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSearchSaving(false);
    }
  }

  async function handleClearSearchConfig() {
    setSearchSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/search-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tavilyApiKey: "",
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to clear search config");
      }

      setHasTavilyApiKey(false);
      setSearchEditing(true);
      setTavilyApiKeyInput("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to clear");
    } finally {
      setSearchSaving(false);
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
        Manage your account settings.
      </Text>

      {/* Timezone Setting */}
      <Box
        mt={4}
        p={3}
        borderWidth="1px"
        borderColor={cardBorder}
        borderRadius="md"
        bg={cardBg}
      >
        <Text fontWeight="medium" fontSize="sm" mb={2}>
          Timezone
        </Text>
        <Text color={subtitleColor} fontSize="xs" mb={3}>
          Set your local timezone for accurate event scheduling.
        </Text>
        <Box maxW="300px">
          <Select.Root
            collection={timezoneOptions}
            value={[timezone]}
            onValueChange={(e) => handleTimezoneChange(e.value)}
            size="sm"
            disabled={timezoneLoading || timezoneSaving}
          >
            <Select.Trigger>
              <Select.ValueText placeholder="Select timezone" />
            </Select.Trigger>
            <Select.Positioner>
              <Select.Content maxH="300px" overflowY="auto">
                {timezoneOptions.items.map((opt) => (
                  <Select.Item item={opt} key={opt.value}>
                    {opt.label}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Positioner>
          </Select.Root>
        </Box>
      </Box>

      {/* AI Providers Section */}
      <Text fontWeight="medium" fontSize="sm" mt={6} mb={2}>
        AI Providers
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

      <Box
        mt={4}
        p={3}
        borderWidth="1px"
        borderColor={cardBorder}
        borderRadius="md"
      >
        <Text fontWeight="medium" fontSize="sm" mb={2}>
          Search API
        </Text>
        <Text color={subtitleColor} fontSize="xs" mb={2}>
          allow AI agents to search.
        </Text>
        <Text color={subtitleColor} fontSize="xs" mb={2}>
          Tavily is built for AI agents to search the web and fetch up-to-date
          information during chat.
        </Text>

        {searchLoading ? (
          <Text color={subtitleColor} fontSize="sm">
            Loading search config...
          </Text>
        ) : (
          <Box
            p={3}
            bg={cardBg}
            borderWidth="1px"
            borderColor={cardBorder}
            borderRadius="md"
          >
            {searchEditing ? (
              <Box>
                <Text fontSize="xs" mb={1}>
                  Tavily API Key{" "}
                  {hasTavilyApiKey ? "(configured)" : "(not set)"}
                </Text>
                <Input
                  size="sm"
                  type="password"
                  placeholder={
                    hasTavilyApiKey ? "Enter new key to replace" : "tvly-..."
                  }
                  value={tavilyApiKeyInput}
                  onChange={(e) => setTavilyApiKeyInput(e.target.value)}
                />

                <Flex gap={2} mt={3}>
                  <Button
                    size="sm"
                    onClick={handleSaveSearchConfig}
                    disabled={searchSaving || !tavilyApiKeyInput.trim()}
                  >
                    Save
                  </Button>
                  {hasTavilyApiKey && (
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
                  )}
                </Flex>
              </Box>
            ) : (
              <Flex justify="space-between" align="center" gap={3}>
                <Box>
                  <Text fontWeight="medium" fontSize="sm">
                    Tavily Search
                  </Text>
                  <Text fontSize="xs" color={subtitleColor}>
                    {hasTavilyApiKey ? "Configured" : "Not configured"}
                  </Text>
                </Box>
                <Flex gap={2}>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSearchEditing(true);
                      setTavilyApiKeyInput("");
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    colorPalette="red"
                    onClick={handleClearSearchConfig}
                    disabled={!hasTavilyApiKey}
                  >
                    Delete
                  </Button>
                </Flex>
              </Flex>
            )}
          </Box>
        )}
      </Box>
    </Box>
  );
}
