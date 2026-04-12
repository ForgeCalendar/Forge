/**
 * Client-side chat hook with tool execution via backend API.
 * Handles streaming AI responses and tool calls.
 */

import { useState, useCallback, useEffect } from "react";
import { streamText, CoreMessage, CoreTool } from "ai";
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
  const buildTools = useCallback((): Record<string, CoreTool> => {
    const toolNames = getToolsForRole(role);
    const tools: Record<string, CoreTool> = {};

    for (const toolName of toolNames) {
      const schema = toolSchemas[toolName];
      tools[toolName] = {
        description: schema.description,
        parameters: schema.inputSchema,
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
      };
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
            `No API key found for provider "${provider.name}". Please add your API key in Settings (/settings).`
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

        // Start streaming
        // TEMP: Disable tools to test basic chat
        const result = await streamText({
          model,
          messages: conversationMessages,
          system: systemPrompt,
          // tools, // Temporarily disabled
          // maxSteps: 10, // Removed - only needed for tool calling
        });

        // Stream the response
        let assistantMessage = "";
        for await (const chunk of result.textStream) {
          assistantMessage += chunk;
          setCurrentMessage(assistantMessage);
        }

        // Add assistant message to history
        const newAssistantMessage: CoreMessage = {
          role: "assistant",
          content: assistantMessage,
        };
        const finalMessages = [...conversationMessages, newAssistantMessage];
        setMessages(finalMessages);
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
          setError("Invalid API key. Please check your API key in Settings.");
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
