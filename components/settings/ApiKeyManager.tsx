"use client";

import { useState, useEffect } from "react";
import {
  Box,
  Button,
  Input,
  Text,
  VStack,
  HStack,
  Card,
  Field,
} from "@chakra-ui/react";
import {
  saveApiKey,
  getApiKey,
  removeApiKey,
  listStoredApiKeys,
} from "@/lib/crypto/storage";
import { useThemeTokens } from "@/lib/theme-tokens";

type Provider = {
  id: string;
  name: string;
  placeholder: string;
};

const PROVIDERS: Provider[] = [
  { id: "anthropic", name: "Anthropic", placeholder: "sk-ant-..." },
  { id: "openai", name: "OpenAI", placeholder: "sk-..." },
  { id: "google", name: "Google (Gemini)", placeholder: "AIza..." },
  { id: "mistral", name: "Mistral", placeholder: "..." },
];

export default function ApiKeyManager() {
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState<Record<string, boolean>>({});
  const [saveStatus, setSaveStatus] = useState<Record<string, string>>({});

  const { textMuted, textError, textSuccess } = useThemeTokens();

  // Load existing API keys on mount
  useEffect(() => {
    const loadKeys = async () => {
      const stored = listStoredApiKeys();
      const keys: Record<string, string> = {};

      for (const provider of stored) {
        const key = await getApiKey(provider);
        if (key) {
          // Show only first/last 4 chars for security
          keys[provider] = `${key.slice(0, 4)}...${key.slice(-4)}`;
        }
      }

      setApiKeys(keys);
    };

    loadKeys();
  }, []);

  const handleSave = async (providerId: string) => {
    const key = inputValues[providerId];
    console.log(`[ApiKeyManager] Saving key for provider: ${providerId}`);
    console.log(`[ApiKeyManager] Key length: ${key?.length || 0}`);

    if (!key || key.trim().length < 10) {
      setSaveStatus({ ...saveStatus, [providerId]: "API key too short" });
      return;
    }

    setIsSaving({ ...isSaving, [providerId]: true });

    try {
      console.log(`[ApiKeyManager] Calling saveApiKey for ${providerId}`);
      await saveApiKey(providerId, key);
      console.log(`[ApiKeyManager] saveApiKey completed successfully`);

      setApiKeys({
        ...apiKeys,
        [providerId]: `${key.slice(0, 4)}...${key.slice(-4)}`,
      });
      setInputValues({ ...inputValues, [providerId]: "" });
      setSaveStatus({ ...saveStatus, [providerId]: "Saved!" });

      // Clear success message after 2 seconds
      setTimeout(() => {
        setSaveStatus((prev) => {
          const { [providerId]: _, ...rest } = prev;
          return rest;
        });
      }, 2000);
    } catch (error: any) {
      console.error(`[ApiKeyManager] Error saving key:`, error);
      setSaveStatus({ ...saveStatus, [providerId]: error.message });
    } finally {
      setIsSaving({ ...isSaving, [providerId]: false });
    }
  };

  const handleRemove = async (providerId: string) => {
    removeApiKey(providerId);
    const { [providerId]: _, ...rest } = apiKeys;
    setApiKeys(rest);
    setInputValues({ ...inputValues, [providerId]: "" });
    setSaveStatus({ ...saveStatus, [providerId]: "Removed" });

    setTimeout(() => {
      setSaveStatus((prev) => {
        const { [providerId]: _, ...rest } = prev;
        return rest;
      });
    }, 2000);
  };

  return (
    <VStack gap={4} align="stretch">
      <Box>
        <Text fontSize="lg" fontWeight="semibold" mb={2}>
          API Keys (Client-Side)
        </Text>
        <Text fontSize="sm" color={textMuted} mb={4}>
          API keys are encrypted and stored in your browser's sessionStorage.
          They are cleared when you log out or close the browser.
        </Text>
      </Box>

      {PROVIDERS.map((provider) => (
        <Card.Root key={provider.id} p={4}>
          <VStack align="stretch" gap={3}>
            <HStack justify="space-between">
              <Text fontWeight="medium">{provider.name}</Text>
              {apiKeys[provider.id] && (
                <Text fontSize="xs" color={textSuccess}>
                  ✓ Stored
                </Text>
              )}
            </HStack>

            {apiKeys[provider.id] ? (
              <HStack>
                <Input
                  value={apiKeys[provider.id]}
                  isReadOnly
                  bg="gray.50"
                  _dark={{ bg: "gray.800" }}
                />
                <Button
                  size="sm"
                  colorScheme="red"
                  onClick={() => handleRemove(provider.id)}
                >
                  Remove
                </Button>
              </HStack>
            ) : (
              <Field.Root>
                <HStack>
                  <Input
                    type="password"
                    placeholder={provider.placeholder}
                    value={inputValues[provider.id] || ""}
                    onChange={(e) =>
                      setInputValues({
                        ...inputValues,
                        [provider.id]: e.target.value,
                      })
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleSave(provider.id);
                      }
                    }}
                  />
                  <Button
                    size="sm"
                    colorScheme="blue"
                    onClick={() => handleSave(provider.id)}
                    disabled={isSaving[provider.id]}
                  >
                    {isSaving[provider.id] ? "Saving..." : "Save"}
                  </Button>
                </HStack>
                {saveStatus[provider.id] && (
                  <Text
                    fontSize="xs"
                    color={
                      saveStatus[provider.id] === "Saved!" ||
                      saveStatus[provider.id] === "Removed"
                        ? textSuccess
                        : textError
                    }
                    mt={1}
                  >
                    {saveStatus[provider.id]}
                  </Text>
                )}
              </Field.Root>
            )}
          </VStack>
        </Card.Root>
      ))}

      <Box p={3} bg="blue.50" _dark={{ bg: "blue.900" }} borderRadius="md">
        <Text fontSize="xs" color={textMuted}>
          <strong>Privacy Note:</strong> API keys are stored encrypted in your
          browser and never sent to our servers. They are automatically cleared
          when you log out or close your browser.
        </Text>
      </Box>
    </VStack>
  );
}
