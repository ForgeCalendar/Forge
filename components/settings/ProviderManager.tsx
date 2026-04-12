"use client";

import { useState } from "react";
import {
  Box,
  Button,
  Card,
  Flex,
  Heading,
  Input,
  Text,
  VStack,
  HStack,
} from "@chakra-ui/react";
import { useProviders, type ProviderType } from "@/storage/secure/useProviders";
import { useThemeTokens } from "@/lib/theme-tokens";
import {
  SelectRoot,
  SelectTrigger,
  SelectContent,
  SelectItem,
} from "@chakra-ui/react";

const PROVIDER_TYPES: { value: ProviderType; label: string }[] = [
  { value: "anthropic", label: "Anthropic (Claude)" },
  { value: "openai", label: "OpenAI (GPT)" },
  { value: "google", label: "Google (Gemini)" },
  { value: "mistral", label: "Mistral" },
  { value: "openai-compatible", label: "OpenAI-Compatible" },
];

export default function ProviderManager() {
  const { providers, loading, createProvider, updateProvider, deleteProvider } =
    useProviders();
  const { textMuted } = useThemeTokens();

  const [newType, setNewType] = useState<ProviderType>("anthropic");
  const [newName, setNewName] = useState("");
  const [newApiKey, setNewApiKey] = useState("");
  const [newBaseUrl, setNewBaseUrl] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editApiKey, setEditApiKey] = useState("");
  const [editBaseUrl, setEditBaseUrl] = useState("");

  const [status, setStatus] = useState<Record<string, string>>({});

  const handleCreate = async () => {
    if (!newName.trim() || !newApiKey.trim()) {
      setStatus({ new: "Name and API key are required" });
      return;
    }

    setStatus({ new: "Saving..." });
    const result = await createProvider({
      type: newType,
      name: newName.trim(),
      apiKey: newApiKey.trim(),
      baseUrl: newType === "openai-compatible" ? newBaseUrl.trim() : undefined,
    });

    if (result.success) {
      setStatus({ new: "Saved!" });
      setNewName("");
      setNewApiKey("");
      setNewBaseUrl("");
      setTimeout(() => setStatus({}), 2000);
    } else {
      setStatus({ new: `Error: ${result.error}` });
    }
  };

  const handleUpdate = async (id: string) => {
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
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this provider?")) return;

    setStatus({ [id]: "Deleting..." });
    const result = await deleteProvider(id);

    if (result.success) {
      setStatus({ [id]: "Deleted!" });
      setTimeout(() => setStatus({}), 2000);
    } else {
      setStatus({ [id]: `Error: ${result.error}` });
    }
  };

  const startEditing = (id: string) => {
    const provider = providers.find((p) => p.id === id);
    if (provider) {
      setEditingId(id);
      setEditName(provider.name);
      setEditApiKey("");
      setEditBaseUrl(provider.baseUrl || "");
    }
  };

  const maskApiKey = (key: string): string => {
    if (key.length <= 8) return "****";
    return `${key.slice(0, 4)}...${key.slice(-4)}`;
  };

  if (loading) {
    return (
      <Box>
        <Text>Loading providers...</Text>
      </Box>
    );
  }

  return (
    <VStack gap={6} align="stretch">
      <Box>
        <Heading size="md" mb={2}>
          AI Providers
        </Heading>
        <Text fontSize="sm" color={textMuted}>
          Manage your AI provider API keys. All data is encrypted and stored
          locally in your browser.
        </Text>
      </Box>

      {/* Existing Providers */}
      {providers.length > 0 && (
        <VStack gap={3} align="stretch">
          {providers.map((provider) => (
            <Card.Root key={provider.id}>
              <Card.Body>
                {editingId === provider.id ? (
                  <VStack gap={3} align="stretch">
                    <Box>
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
                    <Box>
                      <Text fontSize="xs" mb={1}>
                        API Key
                      </Text>
                      <Input
                        size="sm"
                        type="password"
                        value={editApiKey}
                        onChange={(e) => setEditApiKey(e.target.value)}
                        placeholder="Leave blank to keep current"
                      />
                    </Box>
                    {provider.type === "openai-compatible" && (
                      <Box>
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
                    <HStack>
                      <Button
                        size="sm"
                        colorScheme="blue"
                        onClick={() => handleUpdate(provider.id)}
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
                    </HStack>
                    {status[provider.id] && (
                      <Text fontSize="xs" color={textMuted}>
                        {status[provider.id]}
                      </Text>
                    )}
                  </VStack>
                ) : (
                  <Flex justify="space-between" align="center">
                    <Box>
                      <Text fontWeight="medium">{provider.name}</Text>
                      <Text fontSize="xs" color={textMuted}>
                        {
                          PROVIDER_TYPES.find(
                            (pt) => pt.value === provider.type
                          )?.label
                        }{" "}
                        • {maskApiKey(provider.apiKey)}
                        {provider.baseUrl && ` • ${provider.baseUrl}`}
                      </Text>
                    </Box>
                    <HStack>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => startEditing(provider.id)}
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
                    </HStack>
                  </Flex>
                )}
              </Card.Body>
            </Card.Root>
          ))}
        </VStack>
      )}

      {/* Add New Provider */}
      <Card.Root>
        <Card.Body>
          <VStack gap={3} align="stretch">
            <Heading size="sm">Add Provider</Heading>

            <Box>
              <Text fontSize="xs" mb={1}>
                Provider Type
              </Text>
              <SelectRoot
                size="sm"
                value={[newType]}
                onValueChange={(e) => setNewType(e.value[0] as ProviderType)}
              >
                <SelectTrigger>
                  {PROVIDER_TYPES.find((pt) => pt.value === newType)?.label}
                </SelectTrigger>
                <SelectContent>
                  {PROVIDER_TYPES.map((pt) => (
                    <SelectItem key={pt.value} value={pt.value}>
                      {pt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </SelectRoot>
            </Box>

            <Box>
              <Text fontSize="xs" mb={1}>
                Name
              </Text>
              <Input
                size="sm"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="My Anthropic Provider"
              />
            </Box>

            <Box>
              <Text fontSize="xs" mb={1}>
                API Key
              </Text>
              <Input
                size="sm"
                type="password"
                value={newApiKey}
                onChange={(e) => setNewApiKey(e.target.value)}
                placeholder="sk-..."
              />
            </Box>

            {newType === "openai-compatible" && (
              <Box>
                <Text fontSize="xs" mb={1}>
                  Base URL
                </Text>
                <Input
                  size="sm"
                  value={newBaseUrl}
                  onChange={(e) => setNewBaseUrl(e.target.value)}
                  placeholder="https://api.example.com/v1"
                />
              </Box>
            )}

            <Button
              size="sm"
              colorScheme="blue"
              onClick={handleCreate}
              disabled={!newName.trim() || !newApiKey.trim()}
            >
              Add Provider
            </Button>

            {status.new && (
              <Text fontSize="xs" color={textMuted}>
                {status.new}
              </Text>
            )}
          </VStack>
        </Card.Body>
      </Card.Root>
    </VStack>
  );
}
