"use client";

import { useState } from "react";
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
} from "@chakra-ui/react";
import { useChatClient } from "@/hooks/useChatClient";
import { useThemeTokens } from "@/lib/theme-tokens";

export default function ChatDemoPage() {
  const [input, setInput] = useState("");
  const { textMuted } = useThemeTokens();

  const { messages, currentMessage, status, error, sendMessage } =
    useChatClient({
      providerId: "anthropic",
      providerType: "anthropic",
      // Use Claude Sonnet 4.5 (current stable model)
      modelId: "claude-sonnet-4-5-20250929",
      role: "Assistant",
      systemPrompt: "You are a helpful AI assistant.",
    });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && status !== "streaming") {
      sendMessage(input.trim());
      setInput("");
    }
  };

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
                  disabled={status === "streaming"}
                />
                <HStack justify="flex-end">
                  <Button
                    type="submit"
                    colorScheme="blue"
                    disabled={status === "streaming" || !input.trim()}
                  >
                    {status === "streaming" ? "Sending..." : "Send"}
                  </Button>
                </HStack>
              </VStack>
            </form>
          </VStack>
        </Card.Root>

        <Box
          p={3}
          bg="yellow.50"
          _dark={{ bg: "yellow.900" }}
          borderRadius="md"
        >
          <Text fontSize="xs" color={textMuted}>
            <strong>Note:</strong> Make sure you have added your Anthropic API
            key in the Settings page before using this demo.
          </Text>
        </Box>
      </VStack>
    </Container>
  );
}
