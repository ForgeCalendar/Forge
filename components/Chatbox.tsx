import { useMemo, useEffect, useRef } from "react";
import {
  AssistantRuntimeProvider,
  useAssistantInstructions,
  useAssistantApi,
  useAssistantState,
} from "@assistant-ui/react";
import {
  AssistantChatTransport,
  useChatRuntime,
} from "@assistant-ui/react-ai-sdk";
import { Thread } from "./assistant-ui/thread";
import { DEFAULT_SUMMARY_PROMPT } from "./prompts";
import { SummaryPromptContext } from "./assistant-ui/summary-context";
import type { FC } from "react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ChatMessage = any;

type ChatboxProps = {
  name: string;
  systemPrompt?: string;
  summaryPrompt?: string;
  extraParams?: Record<string, string>;
  initialMessage?: string;
  initialMessages?: ChatMessage[];
  providerId?: string;
  modelId?: string;
};

const SystemPromptRegistrar: FC<{ prompt?: string }> = ({ prompt }) => {
  useAssistantInstructions(
    prompt ? { instruction: prompt } : { instruction: "", disabled: true }
  );
  return null;
};

const AutoSendMessage: FC<{ message: string }> = ({ message }) => {
  const api = useAssistantApi();
  const isEmpty = useAssistantState((state) => state.thread.isEmpty);
  const isRunning = useAssistantState((state) => state.thread.isRunning);
  const sent = useRef(false);

  useEffect(() => {
    if (isEmpty && !isRunning && !sent.current) {
      sent.current = true;
      api.thread().append(message);
    }
  }, [api, isEmpty, isRunning, message]);

  return null;
};

export function ChatboxComponent({
  name,
  systemPrompt,
  summaryPrompt = DEFAULT_SUMMARY_PROMPT,
  extraParams,
  initialMessage,
  initialMessages,
  providerId,
  modelId,
}: ChatboxProps) {
  const extraParamsKey = extraParams ? JSON.stringify(extraParams) : "";
  const transport = useMemo(() => {
    const params = new URLSearchParams();
    if (summaryPrompt) params.set("summaryPrompt", summaryPrompt);
    if (providerId) params.set("providerId", providerId);
    if (modelId) params.set("modelId", modelId);
    if (extraParams) {
      for (const [key, value] of Object.entries(extraParams)) {
        params.set(key, value);
      }
    }

    return new AssistantChatTransport({
      api: `/api/chat?${params.toString()}`,
    });
  }, [name, systemPrompt, summaryPrompt, extraParamsKey, providerId, modelId]);

  const hasHistory = initialMessages && initialMessages.length > 0;
  const runtime = useChatRuntime({
    transport,
    ...(hasHistory ? { messages: initialMessages } : {}),
  });
  const providerKey = `${name}-${systemPrompt ?? "default"}-${extraParamsKey}`;

  return (
    <div
      className="flex flex-1 min-h-0 w-full flex-col"
      aria-label={`Chat with ${name}`}
    >
      <AssistantRuntimeProvider key={providerKey} runtime={runtime}>
        <SystemPromptRegistrar prompt={systemPrompt} />
        {initialMessage && <AutoSendMessage message={initialMessage} />}
        <SummaryPromptContext.Provider value={summaryPrompt}>
          <Thread />
        </SummaryPromptContext.Provider>
      </AssistantRuntimeProvider>
    </div>
  );
}
