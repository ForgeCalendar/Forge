/**
 * Client-side chat hook with tool execution via backend API.
 * Handles streaming AI responses and tool calls.
 */

import { useState, useCallback, useEffect } from "react";
import { streamText, CoreMessage, tool } from "ai";
import {
  createClientModel,
  type ProviderType,
  getProviderModels,
} from "@/lib/ai/client";
import { toolSchemas, getToolsForRole } from "@/lib/tools/schemas";
import type { Provider } from "@/storage/secure/useProviders";

type ChatRole = "Assistant" | "GoalPlanner" | "TaskHelper";

type UseChatClientOptions = {
  provider: Provider;
  modelId: string;
  chatHistoryId?: string;
  role?: ChatRole;
  goalId?: string;
  systemPrompt?: string;
  onFinish?: (messages: CoreMessage[]) => void;
};

type MessageStatus = "pending" | "streaming" | "complete" | "error";

export function useChatClient({
  provider,
  modelId,
  chatHistoryId,
  role = "Assistant",
  goalId,
  systemPrompt,
  onFinish,
}: UseChatClientOptions) {
  const [messages, setMessages] = useState<CoreMessage[]>([]);
  const [currentMessage, setCurrentMessage] = useState<string>("");
  const [status, setStatus] = useState<MessageStatus>("complete");
  const [error, setError] = useState<string | null>(null);

  /**
   * Load existing chat history from server.
   */
  useEffect(() => {
    if (!chatHistoryId) return;

    const loadHistory = async () => {
      try {
        const response = await fetch(`/api/chat-history/${chatHistoryId}`);
        if (response.ok) {
          const data = await response.json();
          const parsed = data.messages.map((m: any) => JSON.parse(m.content));
          setMessages(parsed);
        }
      } catch (err) {
        console.error("Failed to load chat history:", err);
      }
    };

    loadHistory();
  }, [chatHistoryId]);

  /**
   * Build tools for the AI based on role.
   */
  const buildTools = useCallback(() => {
    const toolNames = getToolsForRole(role);
    const tools: Record<string, ReturnType<typeof tool>> = {};

    for (const toolName of toolNames) {
      const schema = toolSchemas[toolName];
      tools[toolName] = tool({
        description: schema.description,
        inputSchema: schema.inputSchema,
        execute: async (params: any) => {
          // Execute via backend API
          try {
            const response = await fetch("/api/tools/execute", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                tool: toolName,
                parameters: params,
                context: {
                  chatHistoryId,
                  goalId,
                  role,
                },
              }),
            });

            if (!response.ok) {
              const error = await response.json();
              throw new Error(error.error || "Tool execution failed");
            }

            return await response.json();
          } catch (err: any) {
            console.error(`Tool execution error (${toolName}):`, err);
            return {
              success: false,
              error: err.message || "Tool execution failed",
            };
          }
        },
      });
    }

    return tools;
  }, [role, chatHistoryId, goalId]);

  /**
   * Send a message to the AI.
   */
  const sendMessage = useCallback(
    async (userMessage: string) => {
      setStatus("pending");
      setError(null);
      setCurrentMessage("");

      try {
        // Use provider from secure storage
        console.log("[useChatClient] Using provider:", {
          name: provider.name,
          type: provider.type,
          modelId,
        });

        if (!provider.apiKey) {
          setError(
            `No API key found for provider "${provider.name}". Please add your API key in Account Settings.`
          );
          setStatus("error");
          return;
        }

        // Create model instance
        const model = createClientModel(
          provider.type,
          provider.apiKey,
          modelId,
          provider.baseUrl
        );

        // Build conversation history
        const newUserMessage: CoreMessage = {
          role: "user",
          content: userMessage,
        };
        const conversationMessages = [...messages, newUserMessage];

        // Update messages immediately
        setMessages(conversationMessages);
        setStatus("streaming");

        // Build tools
        const tools = buildTools();

        // Start streaming with tool support
        setStatus("streaming");
        setCurrentMessage("Thinking...");

        const result = await streamText({
          model,
          messages: conversationMessages,
          system: systemPrompt,
          tools,
          maxSteps: 10,
        });

        // Wait for the complete result (all tool calls and final response)
        const finalResponse = await result.response;
        const finalText = await result.text;

        console.log("[useChatClient] Complete response:", {
          messageCount: finalResponse.messages.length,
          finalText,
          finishReason: finalResponse.finishReason,
          messages: finalResponse.messages.map((m: any) => ({
            role: m.role,
            content:
              typeof m.content === "string"
                ? m.content
                : Array.isArray(m.content)
                ? m.content.map((c: any) => c.type)
                : "unknown",
          })),
        });

        // Check if we need to force a text response after tool calls
        const lastMessage =
          finalResponse.messages[finalResponse.messages.length - 1];

        // If the last message is a tool result, we need to continue to get assistant's response
        if (lastMessage?.role === "tool") {
          console.log(
            "[useChatClient] Last message is tool result, continuing for assistant response..."
          );

          // Continue the conversation with tool results to get final response
          const continuationMessages = [
            ...conversationMessages,
            ...finalResponse.messages,
          ];

          const continuationResult = await streamText({
            model,
            messages: continuationMessages,
            system: systemPrompt,
            tools, // Still provide tools in case AI needs more
            maxSteps: 5, // Allow a few more steps if needed
          });

          // Wait for the continuation response
          const continuationResponse = await continuationResult.response;
          const continuationText = await continuationResult.text;

          console.log("[useChatClient] Continuation response:", {
            messageCount: continuationResponse.messages.length,
            finalText: continuationText,
          });

          // Build final message history with all messages including continuation
          const finalMessages = [
            ...continuationMessages,
            ...continuationResponse.messages,
          ];
          setMessages(finalMessages);
        } else {
          // Normal case - response already complete
          const finalMessages = [
            ...conversationMessages,
            ...finalResponse.messages,
          ];
          setMessages(finalMessages);
        }

        setCurrentMessage("");
        setStatus("complete");

        // Call onFinish callback
        if (onFinish) {
          onFinish(finalMessages);
        }
      } catch (err: any) {
        console.error("Chat error:", err);
        console.error("Error details:", {
          name: err.name,
          message: err.message,
          statusCode: err.statusCode,
          url: err.url,
          responseHeaders: err.responseHeaders,
          responseBody: err.responseBody,
        });

        // Detect specific error types
        if (err.statusCode === 404) {
          setError(
            `Model not found (404). The model ID "${modelId}" may be incorrect for ${
              provider.type
            }. Try: ${getProviderModels(provider.type as ProviderType)[0]}`
          );
        } else if (
          err.name === "TypeError" ||
          err.message?.toLowerCase().includes("cors") ||
          err.message?.toLowerCase().includes("network")
        ) {
          setError(
            "This provider does not support browser calls (CORS blocked). Please contact support."
          );
        } else if (err.statusCode === 401) {
          setError(
            "Invalid API key. Please check your API key in Account Settings."
          );
        } else {
          setError(err.message || "An error occurred during chat");
        }

        setStatus("error");
      }
    },
    [provider, modelId, messages, systemPrompt, buildTools, onFinish]
  );

  /**
   * Save chat history to server.
   */
  const saveChatHistory = useCallback(
    async (messagesToSave: CoreMessage[]) => {
      if (!chatHistoryId) return;

      try {
        await fetch(`/api/chat-history/${chatHistoryId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: messagesToSave,
            providerId: provider.id,
            modelId,
          }),
        });
      } catch (err) {
        console.error("Failed to save chat history:", err);
      }
    },
    [chatHistoryId, provider.id, modelId]
  );

  /**
   * Clear current conversation (local only).
   */
  const clearMessages = useCallback(() => {
    setMessages([]);
    setCurrentMessage("");
    setError(null);
    setStatus("complete");
  }, []);

  return {
    messages,
    currentMessage,
    status,
    error,
    sendMessage,
    saveChatHistory,
    clearMessages,
  };
}
