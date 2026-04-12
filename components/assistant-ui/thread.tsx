"use client";

import { MarkdownText } from "@/components/assistant-ui/markdown-text";
import { TooltipIconButton } from "@/components/assistant-ui/tooltip-icon-button";
import {
  useChoiceStore,
  AskUserChoiceUI,
  SuggestEventsUI,
  ModifySuggestedEventUI,
  DeleteSuggestedEventUI,
  ToolCallBox,
} from "@/components/assistant-ui/tool-ui";
import {
  ActionBarPrimitive,
  ComposerPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
  useThreadRuntime,
} from "@assistant-ui/react";
import {
  ArrowUpIcon,
  CheckIcon,
  CopyIcon,
  RefreshCwIcon,
  PaperclipIcon,
  XIcon,
} from "lucide-react";
import { Spinner } from "@chakra-ui/react";
import { useState, useRef, type FC } from "react";

export const Thread: FC = () => {
  return (
    <ThreadPrimitive.Root
      className="flex h-full flex-col bg-background"
      style={{ minHeight: 0, overflow: "hidden" }}
    >
      <AskUserChoiceUI />
      <SuggestEventsUI />
      <ModifySuggestedEventUI />
      <DeleteSuggestedEventUI />
      <ThreadPrimitive.Viewport
        className="flex-1 overflow-y-auto"
        style={{ minHeight: 0 }}
      >
        <div className="mx-auto px-4 py-8" style={{ paddingBottom: "100px" }}>
          <ThreadPrimitive.Empty>
            <div className="flex h-full flex-col items-center justify-center py-20">
              <h1 className="text-2xl font-semibold text-foreground">
                How can I help you today?
              </h1>
            </div>
          </ThreadPrimitive.Empty>

          <ThreadPrimitive.Messages
            components={{
              UserMessage,
              AssistantMessage,
            }}
          />
        </div>
      </ThreadPrimitive.Viewport>

      <div
        className="border-t border-border bg-background px-4 py-4"
        style={{ flexShrink: 0 }}
      >
        <div className="mx-auto">
          <ComposerWithChoices />
        </div>
      </div>
    </ThreadPrimitive.Root>
  );
};

const CUSTOM_OPTION = "__custom__";

const ComposerWithChoices: FC = () => {
  const pending = useChoiceStore((s) => s.pending);
  const setPending = useChoiceStore((s) => s.setPending);
  const runtime = useThreadRuntime();
  const [selected, setSelected] = useState<string | null>(null);
  const [customText, setCustomText] = useState("");

  const answer = selected === CUSTOM_OPTION ? customText : selected;
  const canSend = answer && answer.trim().length > 0;

  const handleSend = () => {
    if (!canSend || !pending) return;
    const message = `Q: ${pending.question}\nA: ${answer}`;
    pending.addResult(answer!);
    runtime.append({
      role: "user",
      content: [{ type: "text", text: message }],
    });
    setPending(null);
    setSelected(null);
    setCustomText("");
  };

  if (pending) {
    return (
      <div className="relative flex w-full items-end rounded-xl border-2 border-primary bg-background shadow-sm p-4">
        <div className="flex flex-col gap-3 flex-1">
          <p className="text-sm text-muted-foreground">{pending.question}</p>
          <div className="flex flex-col gap-2">
            {pending.choices.map((choice) => (
              <label
                key={choice}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                  selected === choice
                    ? "bg-primary/10 border border-primary"
                    : "hover:bg-muted border border-transparent"
                }`}
              >
                <input
                  type="radio"
                  name="choice"
                  value={choice}
                  checked={selected === choice}
                  onChange={() => setSelected(choice)}
                  className="w-4 h-4 accent-primary"
                />
                <span className="text-sm">{choice}</span>
              </label>
            ))}
            <label
              className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                selected === CUSTOM_OPTION
                  ? "bg-primary/10 border border-primary"
                  : "hover:bg-muted border border-transparent"
              }`}
            >
              <input
                type="radio"
                name="choice"
                value={CUSTOM_OPTION}
                checked={selected === CUSTOM_OPTION}
                onChange={() => setSelected(CUSTOM_OPTION)}
                className="w-4 h-4 accent-primary"
              />
              <input
                type="text"
                placeholder="Other (type your answer)..."
                value={customText}
                onChange={(e) => {
                  setCustomText(e.target.value);
                  setSelected(CUSTOM_OPTION);
                }}
                onFocus={() => setSelected(CUSTOM_OPTION)}
                className="flex-1 text-sm bg-transparent outline-none placeholder:text-muted-foreground"
              />
            </label>
          </div>
        </div>
        <div className="flex items-center gap-2 pl-2 pb-1">
          <TooltipIconButton
            tooltip="Send"
            variant="default"
            className="size-8 rounded-full"
            disabled={!canSend}
            onClick={handleSend}
          >
            <ArrowUpIcon className="size-4" />
          </TooltipIconButton>
        </div>
      </div>
    );
  }

  return <Composer />;
};

const Composer: FC = () => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const runtime = useThreadRuntime();

  // Check if goalId is available from URL params
  const goalId = (() => {
    if (typeof window === "undefined") return null;
    const params = new URLSearchParams(window.location.search);
    return params.get("goalId");
  })();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      if (!goalId) {
        alert("File uploads are only available in goal-specific chats");
        e.target.value = "";
        return;
      }
      setSelectedFiles((prev) => [...prev, ...files]);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCustomSend = async () => {
    if (selectedFiles.length === 0 || !goalId) return;

    const inputElement = document.querySelector<HTMLTextAreaElement>(
      'textarea[placeholder="Message..."]'
    );
    const messageText = inputElement?.value?.trim() || "";

    try {
      setUploading(true);

      // Read file contents for text files
      const fileContents = await Promise.all(
        selectedFiles.map(async (file) => {
          if (
            file.type.startsWith("text/") ||
            file.name.endsWith(".txt") ||
            file.name.endsWith(".md") ||
            file.name.endsWith(".json") ||
            file.name.endsWith(".csv")
          ) {
            try {
              return { file, content: await file.text() };
            } catch {
              return { file, content: null };
            }
          }
          return { file, content: null };
        })
      );

      // Upload files
      const uploadedFiles = await Promise.all(
        selectedFiles.map(async (file) => {
          const formData = new FormData();
          formData.append("file", file);
          formData.append("goalId", goalId);

          const response = await fetch("/api/files/upload", {
            method: "POST",
            body: formData,
          });

          if (!response.ok) throw new Error(`Failed to upload ${file.name}`);
          return await response.json();
        })
      );

      // Build message with file info
      let fullMessage = messageText;
      if (uploadedFiles.length > 0) {
        fullMessage += "\n\n**Attached files:**\n";
        for (let i = 0; i < uploadedFiles.length; i++) {
          const f = uploadedFiles[i];
          const content = fileContents[i];
          fullMessage += `\n📎 **${f.filename}** (${(f.size / 1024).toFixed(
            1
          )} KB)\n`;
          if (content.content) {
            fullMessage += `\`\`\`\n${content.content}\n\`\`\`\n`;
          }
        }
      }

      // Send message
      runtime.append({
        role: "user",
        content: [{ type: "text", text: fullMessage }],
      });

      // Clear state
      setSelectedFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (inputElement) inputElement.value = "";
    } catch (error) {
      console.error("Error uploading files:", error);
      alert("Failed to upload files. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  if (selectedFiles.length > 0) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-2 px-2">
          {selectedFiles.map((file, index) => (
            <div
              key={index}
              className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-lg text-xs"
            >
              <PaperclipIcon className="size-3" />
              <span className="max-w-[150px] truncate">{file.name}</span>
              <span className="text-muted-foreground">
                ({(file.size / 1024).toFixed(1)} KB)
              </span>
              <button
                onClick={() => removeFile(index)}
                className="ml-1 p-0.5 hover:bg-background rounded"
                disabled={uploading}
              >
                <XIcon className="size-3" />
              </button>
            </div>
          ))}
        </div>
        <div className="relative flex w-full items-end rounded-xl border-2 border-gray-300 dark:border-gray-600 bg-background shadow-sm">
          <ComposerPrimitive.Input
            placeholder="Message..."
            rows={1}
            autoFocus
            className="flex-1 resize-none bg-transparent text-sm placeholder:text-muted-foreground min-h-[48px] max-h-[200px]"
            style={{
              outline: "none",
              boxShadow: "none",
              padding: "12px 16px",
              resize: "none",
            }}
          />
          <div className="flex items-center gap-2 pr-2 pb-2">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
            <TooltipIconButton
              tooltip="Attach file"
              variant="ghost"
              className="size-8 rounded-full"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              <PaperclipIcon className="size-4" />
            </TooltipIconButton>
            <TooltipIconButton
              tooltip="Send"
              variant="default"
              className="size-8 rounded-full"
              onClick={handleCustomSend}
              disabled={uploading}
            >
              {uploading ? (
                <Spinner size="sm" />
              ) : (
                <ArrowUpIcon className="size-4" />
              )}
            </TooltipIconButton>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ComposerPrimitive.Root className="relative flex w-full items-end rounded-xl border-2 border-gray-300 dark:border-gray-600 bg-background shadow-sm">
      <ComposerPrimitive.Input
        placeholder="Message..."
        rows={1}
        autoFocus
        className="flex-1 resize-none bg-transparent text-sm placeholder:text-muted-foreground min-h-[48px] max-h-[200px]"
        style={{
          outline: "none",
          boxShadow: "none",
          padding: "12px 16px",
          resize: "none",
        }}
      />
      <div className="flex items-center gap-2 pr-2 pb-2">
        {goalId && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              accept="*/*"
            />
            <TooltipIconButton
              tooltip="Attach file"
              variant="ghost"
              className="size-8 rounded-full"
              onClick={() => fileInputRef.current?.click()}
            >
              <PaperclipIcon className="size-4" />
            </TooltipIconButton>
          </>
        )}
        <ThreadPrimitive.If running={false}>
          <ComposerPrimitive.Send asChild>
            <TooltipIconButton
              tooltip="Send"
              variant="default"
              className="size-8 rounded-full"
            >
              <ArrowUpIcon className="size-4" />
            </TooltipIconButton>
          </ComposerPrimitive.Send>
        </ThreadPrimitive.If>
        <ThreadPrimitive.If running>
          <Spinner size="sm" color="gray.500" />
        </ThreadPrimitive.If>
      </div>
    </ComposerPrimitive.Root>
  );
};

const UserMessage: FC = () => {
  return (
    <MessagePrimitive.Root className="mb-6 flex justify-end">
      <div
        className="max-w-[80%] rounded-2xl bg-gray-200 dark:bg-gray-700 text-foreground"
        style={{ padding: "2px 10px" }}
      >
        <MessagePrimitive.Content />
      </div>
    </MessagePrimitive.Root>
  );
};

const AssistantMessage: FC = () => {
  return (
    <MessagePrimitive.Root className="mb-6 group">
      <div className="flex gap-4">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted">
          <span className="text-xs font-medium">AI</span>
        </div>
        <div className="flex-1 space-y-2">
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <MessagePrimitive.Content
              components={{
                Text: MarkdownText,
                tools: { Fallback: ToolCallBox },
              }}
            />
          </div>
          <AssistantActionBar />
        </div>
      </div>
    </MessagePrimitive.Root>
  );
};

const AssistantActionBar: FC = () => {
  return (
    <ActionBarPrimitive.Root hideWhenRunning className="flex gap-1">
      <ActionBarPrimitive.Copy asChild>
        <TooltipIconButton tooltip="Copy" variant="ghost" className="size-7">
          <MessagePrimitive.If copied>
            <CheckIcon className="size-3.5" />
          </MessagePrimitive.If>
          <MessagePrimitive.If copied={false}>
            <CopyIcon className="size-3.5" />
          </MessagePrimitive.If>
        </TooltipIconButton>
      </ActionBarPrimitive.Copy>
      <ActionBarPrimitive.Reload asChild>
        <TooltipIconButton
          tooltip="Regenerate"
          variant="ghost"
          className="size-7"
        >
          <RefreshCwIcon className="size-3.5" />
        </TooltipIconButton>
      </ActionBarPrimitive.Reload>
    </ActionBarPrimitive.Root>
  );
};
