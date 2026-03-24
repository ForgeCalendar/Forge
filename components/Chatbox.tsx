import { useMemo, useEffect, useRef, useState } from "react";
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
import {
  useProvidersQuery,
  useDefaultProviderModel,
} from "@/storage/useProvidersQuery";
import { useChatHistoryQuery } from "@/storage/useChatHistoryQuery";
import type { ProviderWithModels } from "@/storage/useProvidersQuery";
import type { FC } from "react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ChatMessage = any;

type ChatboxProps = {
  name: string;
  chatHistoryId?: string | null;
  systemPrompt?: string;
  summaryPrompt?: string;
  extraParams?: Record<string, string>;
  autoStart?: boolean;
  initialMessages?: ChatMessage[];
};

const SystemPromptRegistrar: FC<{ prompt?: string }> = ({ prompt }) => {
  useAssistantInstructions(
    prompt ? { instruction: prompt } : { instruction: "", disabled: true }
  );
  return null;
};

const AutoStartRun: FC = () => {
  const api = useAssistantApi();
  const isEmpty = useAssistantState((state) => state.thread.isEmpty);
  const isRunning = useAssistantState((state) => state.thread.isRunning);
  const started = useRef(false);

  useEffect(() => {
    if (isEmpty && !isRunning && !started.current) {
      started.current = true;
      api.thread().startRun({ parentId: null });
    }
  }, [api, isEmpty, isRunning]);

  return null;
};

function ProviderModelSelector({
  providers,
  selectedProviderId,
  selectedModelId,
  onProviderChange,
  onModelChange,
}: {
  providers: ProviderWithModels[];
  selectedProviderId: string;
  selectedModelId: string;
  onProviderChange: (providerId: string) => void;
  onModelChange: (modelId: string) => void;
}): React.ReactElement | null {
  if (providers.length === 0) {
    return (
      <div className="px-3 py-2 text-sm text-muted-foreground">
        No providers configured.{" "}
        <span className="font-medium">Go to Settings → Account</span> to add
        one.
      </div>
    );
  }

  const selectedProvider = providers.find((p) => p.id === selectedProviderId);
  const models = selectedProvider?.models ?? [];

  return (
    <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-background/50">
      <label className="text-xs font-medium text-muted-foreground shrink-0">
        Provider
      </label>
      <select
        className="h-7 rounded-md border border-input bg-background px-2 text-xs outline-none focus:ring-1 focus:ring-ring min-w-0 flex-1"
        value={selectedProviderId}
        onChange={(e) => onProviderChange(e.target.value)}
      >
        {providers.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>

      <label className="text-xs font-medium text-muted-foreground shrink-0 ml-2">
        Model
      </label>
      <select
        className="h-7 rounded-md border border-input bg-background px-2 text-xs outline-none focus:ring-1 focus:ring-ring min-w-0 flex-1"
        value={selectedModelId}
        onChange={(e) => onModelChange(e.target.value)}
      >
        {models.map((m) => (
          <option key={m.id} value={m.modelId}>
            {m.name}
          </option>
        ))}
        {models.length === 0 && (
          <option value="" disabled>
            No models
          </option>
        )}
      </select>
    </div>
  );
}

export function ChatboxComponent({
  name,
  chatHistoryId,
  systemPrompt,
  summaryPrompt = DEFAULT_SUMMARY_PROMPT,
  extraParams,
  autoStart,
}: ChatboxProps): React.ReactElement {
  const { data: providers } = useProvidersQuery();
  const defaultPM = useDefaultProviderModel();

  const { data: historyData, isLoading: historyLoading } =
    useChatHistoryQuery(chatHistoryId);

  const [selectedProviderId, setSelectedProviderId] = useState<string>("");
  const [selectedModelId, setSelectedModelId] = useState<string>("");
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) return;

    if (historyData?.providerId && historyData?.modelId) {
      const providerExists = providers?.some(
        (p: ProviderWithModels) => p.id === historyData.providerId
      );
      if (providerExists) {
        setSelectedProviderId(historyData.providerId);
        setSelectedModelId(historyData.modelId);
        initializedRef.current = true;
        return;
      }
    }

    if (defaultPM) {
      setSelectedProviderId(defaultPM.providerId);
      setSelectedModelId(defaultPM.modelId);
      initializedRef.current = true;
    }
  }, [historyData, defaultPM, providers]);

  const handleProviderChange = (providerId: string): void => {
    setSelectedProviderId(providerId);
    const provider = providers?.find(
      (p: ProviderWithModels) => p.id === providerId
    );
    if (provider && provider.models.length > 0) {
      const defaultModel = provider.models.find(
        (m: ProviderWithModels["models"][number]) => m.isDefault
      );
      setSelectedModelId(
        defaultModel ? defaultModel.modelId : provider.models[0].modelId
      );
    } else {
      setSelectedModelId("");
    }
  };

  const handleModelChange = (modelId: string): void => {
    setSelectedModelId(modelId);
  };

  const extraParamsKey = extraParams ? JSON.stringify(extraParams) : "";
  const transport = useMemo(() => {
    const params = new URLSearchParams();
    if (summaryPrompt) params.set("summaryPrompt", summaryPrompt);
    if (selectedProviderId) params.set("providerId", selectedProviderId);
    if (selectedModelId) params.set("modelId", selectedModelId);
    if (extraParams) {
      for (const [key, value] of Object.entries(extraParams)) {
        params.set(key, value);
      }
    }

    return new AssistantChatTransport({
      api: `/api/chat?${params.toString()}`,
    });
  }, [summaryPrompt, extraParamsKey, selectedProviderId, selectedModelId]);

  const initialMessages = historyData?.messages;
  const hasHistory = initialMessages && initialMessages.length > 0;

  const runtime = useChatRuntime({
    transport,
    ...(hasHistory ? { messages: initialMessages } : {}),
  });

  const providerKey = `${name}-${systemPrompt ?? "default"}-${extraParamsKey}-${
    chatHistoryId ?? "new"
  }`;

  if (chatHistoryId && historyLoading) {
    return (
      <div className="flex flex-1 min-h-0 w-full items-center justify-center text-sm text-muted-foreground">
        Loading conversation...
      </div>
    );
  }

  return (
    <div
      className="flex flex-1 min-h-0 w-full flex-col"
      aria-label={`Chat with ${name}`}
    >
      <ProviderModelSelector
        providers={providers ?? []}
        selectedProviderId={selectedProviderId}
        selectedModelId={selectedModelId}
        onProviderChange={handleProviderChange}
        onModelChange={handleModelChange}
      />
      <AssistantRuntimeProvider key={providerKey} runtime={runtime}>
        <SystemPromptRegistrar prompt={systemPrompt} />
        {autoStart && !hasHistory && <AutoStartRun />}
        <SummaryPromptContext.Provider value={summaryPrompt}>
          <Thread />
        </SummaryPromptContext.Provider>
      </AssistantRuntimeProvider>
    </div>
  );
}
