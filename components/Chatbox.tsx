"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import {
  Box,
  VStack,
  HStack,
  Button,
  Textarea,
  Text,
  Select,
  createListCollection,
} from "@chakra-ui/react";
import { useChatClient } from "@/hooks/useChatClient";
import { useThemeTokens } from "@/lib/theme-tokens";
import { useProviders } from "@/storage/secure/useProviders";
import { getDefaultModel } from "@/lib/ai/client";
import { ChatRoleBadge } from "./ChatRoleBadge";
import { buildSystemPrompt } from "@/lib/prompts/system-prompts";
import type { FC } from "react";
import type { Goal } from "@/lib/generated/prisma";

type ChatboxProps = {
  name: string;
  chatHistoryId?: string | null;
  systemPrompt?: string;
  extraParams?: Record<string, string>;
  initialMessage?: string;
  onClose?: () => void;
};

function ChatHeader({
  title,
  role,
  providers,
  selectedProviderId,
  selectedModelId,
  onProviderChange,
  onModelChange,
  onClose,
}: {
  title?: string;
  role?: string;
  providers: Array<{ id: string; name: string; type: string }>;
  selectedProviderId: string;
  selectedModelId: string;
  onProviderChange: (providerId: string) => void;
  onModelChange: (modelId: string) => void;
  onClose?: () => void;
}): React.ReactElement | null {
  if (providers.length === 0) {
    return (
      <div className="flex flex-col border-b border-border bg-background/50">
        <div className="flex items-center justify-between px-3 py-2">
          <div className="text-sm font-medium truncate flex-1">
            {title || "Untitled Chat"}
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="ml-2 p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
              aria-label="Close"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
          )}
        </div>
        <div className="px-3 py-2 text-sm text-muted-foreground">
          No providers configured. Please add an AI provider in Account
          Settings.
        </div>
      </div>
    );
  }

  const selectedProvider = providers.find((p) => p.id === selectedProviderId);

  return (
    <div className="flex flex-col border-b border-border bg-background/50">
      {/* First row: Title + Close button */}
      <div className="flex items-center justify-between px-3 py-2">
        <div
          className="truncate flex-1"
          style={{ fontSize: "1.125rem", fontWeight: 700 }}
        >
          {title || "Untitled Chat"}
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="ml-2 p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
            aria-label="Close"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Second row: Role badge */}
      {role && (
        <div className="px-3 pb-2">
          <ChatRoleBadge role={role} size="sm" />
        </div>
      )}

      {/* Third row: Provider/Model selectors */}
      <div className="flex items-center gap-2 px-3 py-2">
        <label className="text-xs font-medium text-muted-foreground shrink-0">
          Provider
        </label>
        <select
          className="h-6 rounded-md border border-input bg-background px-1 text-xs outline-none focus:ring-1 focus:ring-ring min-w-0 flex-1"
          value={selectedProviderId}
          onChange={(e) => onProviderChange(e.target.value)}
        >
          {providers.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>

        <label className="text-xs font-medium text-muted-foreground shrink-0 ml-1">
          Model
        </label>
        <div className="text-xs flex-1 px-1">{selectedModelId}</div>
      </div>
    </div>
  );
}

export function ChatboxComponent({
  name,
  chatHistoryId,
  systemPrompt,
  extraParams,
  initialMessage,
  onClose,
}: ChatboxProps): React.ReactElement {
  const { providers, loading: loadingProviders } = useProviders();
  const { textMuted } = useThemeTokens();

  const [selectedProviderId, setSelectedProviderId] = useState<string>("");
  const [input, setInput] = useState("");
  const [chatTitle, setChatTitle] = useState<string>(name);
  const [loadedRole, setLoadedRole] = useState<string | undefined>(undefined);
  const [loadedGoalId, setLoadedGoalId] = useState<string | undefined>(
    undefined
  );
  const [loadedEventId, setLoadedEventId] = useState<string | undefined>(
    undefined
  );
  const [timezone, setTimezone] = useState<string>("UTC");
  const [goalData, setGoalData] = useState<Goal | null>(null);
  const [eventTitle, setEventTitle] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load chat history data to get role, goalId, eventId
  useEffect(() => {
    if (!chatHistoryId) return;

    const loadChatHistory = async () => {
      try {
        const response = await fetch(`/api/chat-history/${chatHistoryId}`);
        if (response.ok) {
          const data = await response.json();
          if (data.role) setLoadedRole(data.role);
          if (data.title) setChatTitle(data.title);
          if (data.goalId) setLoadedGoalId(data.goalId);
          if (data.eventId) setLoadedEventId(data.eventId);
          if (data.eventTitle) setEventTitle(data.eventTitle);
        }
      } catch (err) {
        console.error("Failed to load chat history:", err);
      }
    };

    loadChatHistory();
  }, [chatHistoryId]);

  // Auto-select first provider if available
  useEffect(() => {
    if (providers.length > 0 && !selectedProviderId) {
      setSelectedProviderId(providers[0].id);
    }
  }, [providers, selectedProviderId]);

  // Get the selected provider
  const selectedProvider = useMemo(
    () => providers.find((p) => p.id === selectedProviderId),
    [providers, selectedProviderId]
  );

  // Get default model for selected provider
  const modelId = useMemo(() => {
    if (!selectedProvider) return "";
    return getDefaultModel(selectedProvider.type);
  }, [selectedProvider]);

  // Determine role and IDs from loaded chat history or extraParams
  const role = useMemo(() => {
    // Prefer loaded role from chat history, fallback to extraParams
    const effectiveRole = loadedRole || extraParams?.role || "Assistant";
    return effectiveRole as "Assistant" | "GoalPlanner" | "TaskHelper";
  }, [loadedRole, extraParams]);

  const goalId = useMemo(() => {
    return loadedGoalId || extraParams?.goalId;
  }, [loadedGoalId, extraParams]);

  const eventId = useMemo(() => {
    return loadedEventId || extraParams?.eventId;
  }, [loadedEventId, extraParams]);

  // Fetch user timezone
  useEffect(() => {
    const fetchTimezone = async () => {
      try {
        const response = await fetch("/api/user");
        if (response.ok) {
          const data = await response.json();
          setTimezone(data.timezone || "UTC");
        }
      } catch (err) {
        console.error("Failed to fetch timezone:", err);
      }
    };
    fetchTimezone();
  }, []);

  // Fetch goal data for GoalPlanner role (if not already loaded from chat history)
  useEffect(() => {
    if (role !== "GoalPlanner" || !goalId || goalData) return;

    const fetchGoal = async () => {
      try {
        const response = await fetch(`/api/goals/${goalId}`);
        if (response.ok) {
          const data = await response.json();
          setGoalData(data);
        }
      } catch (err) {
        console.error("Failed to fetch goal:", err);
      }
    };
    fetchGoal();
  }, [role, goalId, goalData]);

  // Fetch event data for TaskHelper role (if not already loaded from chat history)
  useEffect(() => {
    if (role !== "TaskHelper" || !eventId || eventTitle) return;

    const fetchEvent = async () => {
      try {
        const response = await fetch(`/api/events/${eventId}`);
        if (response.ok) {
          const data = await response.json();
          setEventTitle(data.title);
        }
      } catch (err) {
        console.error("Failed to fetch event:", err);
      }
    };
    fetchEvent();
  }, [role, eventId, eventTitle]);

  // Build system prompt based on role
  const computedSystemPrompt = useMemo(() => {
    // If a custom system prompt is provided, use it
    if (systemPrompt) return systemPrompt;

    // Otherwise, build the appropriate system prompt based on role
    try {
      if (role === "GoalPlanner" && goalData) {
        return buildSystemPrompt({
          role: "GoalPlanner",
          goal: goalData,
          timezone,
        });
      } else if (role === "TaskHelper" && eventTitle) {
        return buildSystemPrompt({
          role: "TaskHelper",
          eventTitle,
          timezone,
        });
      } else {
        return buildSystemPrompt({
          role: "Assistant",
          timezone,
        });
      }
    } catch (err) {
      console.error("Failed to build system prompt:", err);
      // Fallback to basic assistant prompt
      return `You are a helpful AI assistant.

When you use tools to retrieve information, you MUST always provide a text response to the user after getting the tool results. Never leave the user hanging after a tool call - always follow up with a helpful message that incorporates what you learned from the tool.`;
    }
  }, [systemPrompt, role, goalData, eventTitle, timezone]);

  // Use the chat client hook
  const { messages, currentMessage, status, error, sendMessage } =
    useChatClient({
      provider: selectedProvider || {
        id: "",
        type: "anthropic",
        name: "",
        apiKey: "",
      },
      modelId,
      chatHistoryId: chatHistoryId || undefined,
      role,
      goalId,
      systemPrompt: computedSystemPrompt,
    });

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, currentMessage]);

  // Send initial message if provided
  const initialMessageSent = useRef(false);
  useEffect(() => {
    if (
      initialMessage &&
      !initialMessageSent.current &&
      selectedProvider &&
      status === "complete"
    ) {
      initialMessageSent.current = true;
      sendMessage(initialMessage);
    }
  }, [initialMessage, selectedProvider, status, sendMessage]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && status !== "streaming" && selectedProvider) {
      sendMessage(input.trim());
      setInput("");
    }
  };

  const handleProviderChange = (providerId: string) => {
    setSelectedProviderId(providerId);
  };

  // Map roles to their border colors (matching badge colors)
  const roleBorderColors: Record<string, { light: string; dark: string }> = {
    GoalPlanner: { light: "purple.400", dark: "purple.600" },
    Assistant: { light: "blue.400", dark: "blue.600" },
    TaskHelper: { light: "green.400", dark: "green.600" },
  };

  // Render loading state
  if (loadingProviders || (!selectedProvider && providers.length > 0)) {
    return (
      <div className="flex flex-1 min-h-0 w-full items-center justify-center text-sm text-muted-foreground">
        Loading providers...
      </div>
    );
  }

  const chatContent = (
    <div
      className="flex flex-1 min-h-0 w-full flex-col"
      aria-label={`Chat with ${name}`}
    >
      <ChatHeader
        title={chatTitle}
        role={role}
        providers={providers.map((p) => ({
          id: p.id,
          name: p.name,
          type: p.type,
        }))}
        selectedProviderId={selectedProviderId}
        selectedModelId={modelId}
        onProviderChange={handleProviderChange}
        onModelChange={() => {}}
        onClose={onClose}
      />

      {/* Messages area */}
      <Box
        flex={1}
        overflowY="auto"
        p={4}
        bg="background"
        _dark={{ bg: "gray.900" }}
      >
        <VStack gap={3} align="stretch">
          {messages.map((msg, idx) => {
            // Extract text content from message
            let content = "";
            if (typeof msg.content === "string") {
              content = msg.content;
            } else if (Array.isArray(msg.content)) {
              // Content is an array of parts (text, tool calls, etc.)
              content = msg.content
                .filter((part: any) => part.type === "text")
                .map((part: any) => part.text)
                .join("\n");
            }

            // Skip rendering if there's no text content
            if (!content && msg.role === "assistant") {
              return null;
            }

            return (
              <Box
                key={idx}
                p={3}
                bg={msg.role === "user" ? "blue.50" : "gray.50"}
                _dark={{
                  bg: msg.role === "user" ? "blue.900" : "gray.800",
                }}
                borderRadius="md"
              >
                <Text fontSize="xs" fontWeight="bold" mb={1} color={textMuted}>
                  {msg.role === "user"
                    ? "You"
                    : msg.role === "tool"
                    ? "Tool Result"
                    : "Assistant"}
                </Text>
                {content && (
                  <Text fontSize="sm" whiteSpace="pre-wrap">
                    {content}
                  </Text>
                )}
              </Box>
            );
          })}

          {/* Current streaming message */}
          {currentMessage && (
            <Box
              p={3}
              bg="gray.50"
              _dark={{ bg: "gray.800" }}
              borderRadius="md"
            >
              <Text fontSize="xs" fontWeight="bold" mb={1} color={textMuted}>
                Assistant
              </Text>
              <Text fontSize="sm" whiteSpace="pre-wrap">
                {currentMessage}
              </Text>
            </Box>
          )}

          {/* Status indicators */}
          {status === "streaming" && (
            <Text fontSize="xs" color={textMuted}>
              Streaming response...
            </Text>
          )}

          {error && (
            <Box p={3} bg="red.50" _dark={{ bg: "red.900" }} borderRadius="md">
              <Text fontSize="sm" color="red.600" _dark={{ color: "red.400" }}>
                Error: {error}
              </Text>
            </Box>
          )}

          <div ref={messagesEndRef} />
        </VStack>
      </Box>

      {/* Input area */}
      <Box borderTop="1px solid" borderColor="border" p={3} bg="background/50">
        <form onSubmit={handleSubmit}>
          <VStack gap={2} align="stretch">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              rows={3}
              disabled={status === "streaming" || !selectedProvider}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
            />
            <HStack justify="flex-end">
              <Button
                type="submit"
                colorScheme="blue"
                size="sm"
                disabled={
                  status === "streaming" || !input.trim() || !selectedProvider
                }
              >
                {status === "streaming" ? "Sending..." : "Send"}
              </Button>
            </HStack>
          </VStack>
        </form>
      </Box>
    </div>
  );

  // Apply colored border box for roles with defined colors
  if (role && roleBorderColors[role]) {
    const colors = roleBorderColors[role];
    return (
      <Box
        flex={1}
        minH={0}
        borderRadius="xl"
        borderWidth="2px"
        borderColor={colors.light}
        bg="white"
        _dark={{ borderColor: colors.dark, bg: "gray.800" }}
        overflow="hidden"
        m={2}
        p={3}
        display="flex"
        flexDir="column"
      >
        {chatContent}
      </Box>
    );
  }

  return chatContent;
}
