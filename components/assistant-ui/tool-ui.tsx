"use client";

import { useThread, useThreadRuntime } from "@assistant-ui/react";
import { useCallback, useMemo } from "react";

type AskUserChoiceArgs = {
  question: string;
  choices: string[];
};

export type PendingChoice = {
  question: string;
  choices: string[];
  toolCallId: string;
};

function findPendingChoice(
  messages: readonly {
    role: string;
    status?: { type: string };
    content: readonly {
      type: string;
      toolName?: string;
      result?: unknown;
      args?: unknown;
      toolCallId?: string;
    }[];
  }[]
): PendingChoice | null {
  if (messages.length === 0) return null;

  const lastMessage = messages[messages.length - 1];
  if (lastMessage.role !== "assistant") return null;

  // Check if the message requires action (pending tool calls)
  if (lastMessage.status?.type !== "requires-action") return null;

  // Find askUserChoice tool call without a result
  for (const part of lastMessage.content) {
    if (
      part.type === "tool-call" &&
      part.toolName === "askUserChoice" &&
      part.result === undefined
    ) {
      const args = part.args as AskUserChoiceArgs;
      if (args.question && args.choices) {
        return {
          question: args.question,
          choices: args.choices,
          toolCallId: part.toolCallId!,
        };
      }
    }
  }

  return null;
}

export function usePendingUserChoice(): PendingChoice | null {
  const messages = useThread((state) => state.messages);

  return useMemo(() => findPendingChoice(messages), [messages]);
}

export function ChoiceComposer({
  pendingChoice,
}: {
  pendingChoice: PendingChoice;
}) {
  const runtime = useThreadRuntime();

  const handleSelect = useCallback(
    (choice: string) => {
      runtime.append({
        role: "user",
        content: [{ type: "text", text: choice }],
      });
    },
    [runtime]
  );

  return (
    <div className="flex flex-col gap-3 w-full">
      <p className="text-sm text-muted-foreground">{pendingChoice.question}</p>
      <div className="flex flex-wrap gap-2">
        {pendingChoice.choices.map((choice) => (
          <button
            key={choice}
            onClick={() => handleSelect(choice)}
            className="px-4 py-2 text-sm rounded-lg border-2 border-border bg-background hover:bg-muted hover:border-primary transition-colors"
          >
            {choice}
          </button>
        ))}
      </div>
    </div>
  );
}
