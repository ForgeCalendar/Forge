"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Box,
  Container,
  Heading,
  VStack,
  HStack,
  Button,
  Textarea,
  Text,
  Card,
  Link,
  Select,
  createListCollection,
} from "@chakra-ui/react";
import { useChatClient } from "@/hooks/useChatClient";
import { useThemeTokens } from "@/lib/theme-tokens";
import { useProviders } from "@/storage/secure/useProviders";
import { getDefaultModel } from "@/lib/ai/client";

export default function ChatDemoPage() {
  const { providers, loading: loadingProviders } = useProviders();
  const { textMuted } = useThemeTokens();

  const [selectedProviderId, setSelectedProviderId] = useState<string>("");
  const [input, setInput] = useState("");

  // Get the selected provider
  const selectedProvider = useMemo(
    () => providers.find((p) => p.id === selectedProviderId),
    [providers, selectedProviderId]
  );

  // Create collection for Select component
  const providerCollection = useMemo(
    () =>
      createListCollection({
        items: providers.map((p) => ({
          label: `${p.name} (${p.type})`,
          value: p.id,
        })),
      }),
    [providers]
  );

  // Auto-select first provider if available
  useEffect(() => {
    if (providers.length > 0 && !selectedProviderId) {
      setSelectedProviderId(providers[0].id);
    }
  }, [providers, selectedProviderId]);

  // Get default model for selected provider
  const modelId = useMemo(() => {
    if (!selectedProvider) return "";
    return getDefaultModel(selectedProvider.type);
  }, [selectedProvider]);

  // Always call all hooks before any conditional returns
  const { messages, currentMessage, status, error, sendMessage } =
    useChatClient({
      provider: selectedProvider || {
        id: "",
        type: "anthropic",
        name: "",
        apiKey: "",
      },
      modelId,
      role: "Assistant",
      systemPrompt: "You are a helpful AI assistant.",
    });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && status !== "streaming" && selectedProvider) {
      sendMessage(input.trim());
      setInput("");
    }
  };

  // Render loading state
  if (loadingProviders || (!selectedProvider && providers.length > 0)) {
    return (
      <Container maxW="container.md" py={8}>
        <Text>Loading...</Text>
      </Container>
    );
  }

  // Render no providers state
  if (providers.length === 0) {
    return (
      <Container maxW="container.md" py={8}>
        <VStack gap={4} align="stretch">
          <Heading size="lg">No Providers Found</Heading>
          <Text color={textMuted}>
            Please add an AI provider in Account Settings (Providers tab) before
            using the chat demo.
          </Text>
        </VStack>
      </Container>
    );
  }

  // Render main chat UI
  return (
    <Container maxW="container.md" py={8}>
      <VStack gap={6} align="stretch">
        <Box>
          <Heading size="lg" mb={2}>
            Client-Side Chat Demo
          </Heading>
          <Text fontSize="sm" color={textMuted}>
            This chat uses client-side AI with encrypted API keys stored in your
            browser.
          </Text>
        </Box>

        {/* Provider Selector */}
        <Box>
          <Text fontSize="sm" mb={2}>
            Select Provider
          </Text>
          {selectedProvider && (
            <Select.Root
              collection={providerCollection}
              value={[selectedProviderId]}
              onValueChange={(e) => setSelectedProviderId(e.value[0])}
              size="sm"
            >
              <Select.Trigger>
                <Select.ValueText>
                  {selectedProvider.name} ({selectedProvider.type})
                </Select.ValueText>
              </Select.Trigger>
              <Select.Content>
                {providerCollection.items.map((option) => (
                  <Select.Item key={option.value} item={option}>
                    {option.label}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>
          )}
        </Box>

        <Card.Root>
          <VStack gap={4} align="stretch" p={4}>
            {/* Messages */}
            <Box
              minH="400px"
              maxH="400px"
              overflowY="auto"
              border="1px solid"
              borderColor="gray.200"
              _dark={{ borderColor: "gray.700" }}
              borderRadius="md"
              p={4}
            >
              <VStack gap={3} align="stretch">
                {messages.map((msg, idx) => (
                  <Box
                    key={idx}
                    p={3}
                    bg={msg.role === "user" ? "blue.50" : "gray.50"}
                    _dark={{
                      bg: msg.role === "user" ? "blue.900" : "gray.800",
                    }}
                    borderRadius="md"
                  >
                    <Text
                      fontSize="xs"
                      fontWeight="bold"
                      mb={1}
                      color={textMuted}
                    >
                      {msg.role === "user" ? "You" : "Assistant"}
                    </Text>
                    <Text fontSize="sm">{msg.content}</Text>
                  </Box>
                ))}

                {/* Current streaming message */}
                {currentMessage && (
                  <Box
                    p={3}
                    bg="gray.50"
                    _dark={{ bg: "gray.800" }}
                    borderRadius="md"
                  >
                    <Text
                      fontSize="xs"
                      fontWeight="bold"
                      mb={1}
                      color={textMuted}
                    >
                      Assistant
                    </Text>
                    <Text fontSize="sm">{currentMessage}</Text>
                  </Box>
                )}

                {/* Status indicators */}
                {status === "streaming" && (
                  <Text fontSize="xs" color={textMuted}>
                    Streaming response...
                  </Text>
                )}

                {error && (
                  <Box
                    p={3}
                    bg="red.50"
                    _dark={{ bg: "red.900" }}
                    borderRadius="md"
                  >
                    <Text
                      fontSize="sm"
                      color="red.600"
                      _dark={{ color: "red.400" }}
                    >
                      Error: {error}
                    </Text>
                  </Box>
                )}
              </VStack>
            </Box>

            {/* Input form */}
            <form onSubmit={handleSubmit}>
              <VStack gap={2} align="stretch">
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type your message..."
                  rows={3}
                  disabled={status === "streaming" || !selectedProvider}
                />
                <HStack justify="flex-end">
                  <Button
                    type="submit"
                    colorScheme="blue"
                    disabled={
                      status === "streaming" ||
                      !input.trim() ||
                      !selectedProvider
                    }
                  >
                    {status === "streaming" ? "Sending..." : "Send"}
                  </Button>
                </HStack>
              </VStack>
            </form>
          </VStack>
        </Card.Root>

        <Box p={3} bg="blue.50" _dark={{ bg: "blue.900" }} borderRadius="md">
          <Text fontSize="xs" color={textMuted}>
            <strong>Note:</strong> Using{" "}
            {selectedProvider?.name || "no provider"} with model{" "}
            {modelId || "none"}
          </Text>
        </Box>
      </VStack>
    </Container>
  );
}
