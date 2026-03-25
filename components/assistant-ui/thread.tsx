"use client";

import { MarkdownText } from "@/components/assistant-ui/markdown-text";
import { TooltipIconButton } from "@/components/assistant-ui/tooltip-icon-button";
import {
  ActionBarPrimitive,
  ComposerPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
} from "@assistant-ui/react";
import {
  ArrowUpIcon,
  CheckIcon,
  CopyIcon,
  RefreshCwIcon,
  SquareIcon,
} from "lucide-react";
import type { FC } from "react";

export const Thread: FC = () => {
  return (
    <ThreadPrimitive.Root className="flex h-full flex-col bg-background">
      <ThreadPrimitive.Viewport className="flex-1 overflow-y-auto">
        <div className="mx-auto px-4 py-8">
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

      <div className="border-t border-border bg-background px-4 py-4">
        <div className="mx-auto">
          <Composer />
        </div>
      </div>
    </ThreadPrimitive.Root>
  );
};

const Composer: FC = () => {
  return (
    <ComposerPrimitive.Root className="relative flex w-full items-end rounded-2xl border border-input bg-background shadow-sm">
      <ComposerPrimitive.Input
        placeholder="Message..."
        rows={1}
        autoFocus
        className="flex-1 resize-none bg-transparent px-4 py-3 text-sm placeholder:text-muted-foreground min-h-[48px] max-h-[200px]"
        style={{ outline: "none", boxShadow: "none" }}
      />
      <div className="flex items-center gap-2 pr-2 pb-2">
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
          <ComposerPrimitive.Cancel asChild>
            <TooltipIconButton
              tooltip="Stop"
              variant="default"
              className="size-8 rounded-full"
            >
              <SquareIcon className="size-3 fill-current" />
            </TooltipIconButton>
          </ComposerPrimitive.Cancel>
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
            <MessagePrimitive.Content components={{ Text: MarkdownText }} />
          </div>
          <AssistantActionBar />
        </div>
      </div>
    </MessagePrimitive.Root>
  );
};

const AssistantActionBar: FC = () => {
  return (
    <ActionBarPrimitive.Root
      hideWhenRunning
      autohide="not-last"
      className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
    >
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
