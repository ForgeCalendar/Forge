import { useMemo } from "react";
import {
  AssistantRuntimeProvider,
  useAssistantInstructions,
} from "@assistant-ui/react";
import {
  AssistantChatTransport,
  useChatRuntime,
} from "@assistant-ui/react-ai-sdk";
import { Thread } from "./assistant-ui/thread";
import { DEFAULT_SUMMARY_PROMPT } from "./prompts";
import { SummaryPromptContext } from "./assistant-ui/summary-context";
import type { FC } from "react";

type ChatboxProps = {
  name: string;
  systemPrompt?: string;
  summaryPrompt?: string;
  extraParams?: Record<string, string>;
};

const SystemPromptRegistrar: FC<{ prompt?: string }> = ({ prompt }) => {
  useAssistantInstructions(
    prompt ? { instruction: prompt } : { instruction: "", disabled: true }
  );
  return null;
};

export function ChatboxComponent({
  name,
  systemPrompt,
  summaryPrompt = DEFAULT_SUMMARY_PROMPT,
  extraParams,
}: ChatboxProps) {
  const extraParamsKey = extraParams
    ? JSON.stringify(extraParams)
    : "";
  const transport = useMemo(() => {
    const params = new URLSearchParams();
    if (summaryPrompt) params.set("summaryPrompt", summaryPrompt);
    // For now, always use Claude (Anthropic provider)
    params.set("provider", "ANTHROPIC");
    if (extraParams) {
      for (const [key, value] of Object.entries(extraParams)) {
        params.set(key, value);
      }
    }

    return new AssistantChatTransport({
      api: `/api/chat?${params.toString()}`,
    });
  }, [name, systemPrompt, summaryPrompt, extraParamsKey]);
  const runtime = useChatRuntime({ transport });
  const providerKey = `${name}-${systemPrompt ?? "default"}-${extraParamsKey}`;

  return (
    <div
      className="flex h-full w-full min-h-[60vh]"
      aria-label={`Chat with ${name}`}
    >
      <AssistantRuntimeProvider key={providerKey} runtime={runtime}>
        <SystemPromptRegistrar prompt={systemPrompt} />
        <SummaryPromptContext.Provider value={summaryPrompt}>
          <Thread />
        </SummaryPromptContext.Provider>
      </AssistantRuntimeProvider>
    </div>
  );
}
