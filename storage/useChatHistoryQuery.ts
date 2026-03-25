import { useQuery } from "@tanstack/react-query";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ChatMessage = any;

export type ChatHistoryResponse = {
  id: string;
  title: string;
  providerId: string | null;
  modelId: string | null;
  messages: ChatMessage[];
};

export type ChatHistoryListItem = {
  id: string;
  title: string;
  role: string;
  createdAt: string;
  updatedAt: string;
};

export const chatHistoryKeys = {
  all: ["chatHistories"] as const,
  detail: (id: string) => ["chatHistory", id] as const,
};

async function fetchChatHistory(
  chatHistoryId: string
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

async function fetchChatHistories(): Promise<ChatHistoryListItem[]> {
  const response = await fetch("/api/chat-history");
  if (!response.ok) throw new Error("Failed to fetch chat histories");
  return response.json();
}

export function useChatHistoriesQuery() {
  return useQuery({
    queryKey: chatHistoryKeys.all,
    queryFn: fetchChatHistories,
  });
}
