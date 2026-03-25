"use client";

import { useMemo, useEffect, useRef, useState } from "react";
import { AssistantRuntimeProvider } from "@assistant-ui/react";
import {
  useChatRuntime,
  AssistantChatTransport,
} from "@assistant-ui/react-ai-sdk";
import { Thread } from "./assistant-ui/thread";
import {
  useProvidersQuery,
  useDefaultProviderModel,
} from "@/storage/useProvidersQuery";
import { useChatHistoryQuery } from "@/storage/useChatHistoryQuery";
import type { ProviderWithModels } from "@/storage/useProvidersQuery";
import type { FC } from "react";

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
  providers,
  selectedProviderId,
  selectedModelId,
  onProviderChange,
  onModelChange,
  onClose,
}: {
  title?: string;
  providers: ProviderWithModels[];
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
          No providers configured.{" "}
          <span className="font-medium">Go to Settings → Account</span> to add
          one.
        </div>
      </div>
    );
  }

  const selectedProvider = providers.find((p) => p.id === selectedProviderId);
  const models = selectedProvider?.models ?? [];

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

      {/* Second row: Provider/Model selectors */}
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
        <select
          className="h-6 rounded-md border border-input bg-background px-1 text-xs outline-none focus:ring-1 focus:ring-ring min-w-0 flex-1"
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
    </div>
  );
}

export function ChatboxComponent({
  name,
  chatHistoryId,
  extraParams,
  onClose,
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
  }, [extraParamsKey, selectedProviderId, selectedModelId]);

  const initialMessages = historyData?.messages;
  const hasHistory = initialMessages && initialMessages.length > 0;

  const runtime = useChatRuntime({
    transport,
    ...(hasHistory ? { messages: initialMessages } : {}),
  });

  const providerKey = `${name}-${extraParamsKey}-${chatHistoryId ?? "new"}`;

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
      <ChatHeader
        title={historyData?.title}
        providers={providers ?? []}
        selectedProviderId={selectedProviderId}
        selectedModelId={selectedModelId}
        onProviderChange={handleProviderChange}
        onModelChange={handleModelChange}
        onClose={onClose}
      />
      <AssistantRuntimeProvider key={providerKey} runtime={runtime}>
        <Thread />
      </AssistantRuntimeProvider>
    </div>
  );
}
