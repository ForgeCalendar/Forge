import { useQuery } from "@tanstack/react-query";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ChatMessage = any;

export const chatHistoryKeys = {
  detail: (goalId: string) => ["chatHistory", goalId] as const,
};

async function fetchChatHistory(goalId: string): Promise<ChatMessage[]> {
  const response = await fetch(`/api/goals/${goalId}/chat-history`);
  if (!response.ok) throw new Error("Failed to fetch chat history");
  const data = await response.json();
  return (data.messages ?? []).map((msg: ChatMessage) => ({
    ...msg,
    createdAt: msg.createdAt ? new Date(msg.createdAt) : undefined,
  }));
}

export function useChatHistoryQuery(goalId: string | null) {
  return useQuery({
    queryKey: chatHistoryKeys.detail(goalId ?? ""),
    queryFn: () => fetchChatHistory(goalId!),
    enabled: !!goalId,
  });
}
