import { useQuery } from "@tanstack/react-query";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ChatMessage = any;

export type ChatHistoryResponse = {
  id: string;
  providerId: string | null;
  modelId: string | null;
  messages: ChatMessage[];
};

export const chatHistoryKeys = {
  detail: (id: string) => ["chatHistory", id] as const,
};

async function fetchChatHistory(
  chatHistoryId: string,
): Promise<ChatHistoryResponse> {
  const response = await fetch(`/api/chat-history/${chatHistoryId}`);
  if (!response.ok) throw new Error("Failed to fetch chat history");
  const data: ChatHistoryResponse = await response.json();
  return {
    ...data,
    messages: (data.messages ?? []).map((msg: ChatMessage, idx: number) => ({
      ...msg,
      id: msg.id || `history-${idx}-${Date.now()}`,
      createdAt: msg.createdAt ? new Date(msg.createdAt) : undefined,
    })),
  };
}

export function useChatHistoryQuery(chatHistoryId: string | null | undefined) {
  return useQuery({
    queryKey: chatHistoryKeys.detail(chatHistoryId ?? ""),
    queryFn: () => fetchChatHistory(chatHistoryId!),
    enabled: !!chatHistoryId,
  });
}
