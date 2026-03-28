"use client";

import { create } from "zustand";
import { makeAssistantToolUI } from "@assistant-ui/react";
import type { ToolCallMessagePartProps } from "@assistant-ui/react";
import { useEffect, useRef } from "react";
import {
  Loader2Icon,
  CheckCircle2Icon,
  XCircleIcon,
  WrenchIcon,
} from "lucide-react";

type AskUserChoiceArgs = {
  question: string;
  choices: string[];
};

export type PendingChoice = {
  question: string;
  choices: string[];
  addResult: (result: string) => void;
};

type ChoiceStore = {
  pending: PendingChoice | null;
  setPending: (pending: PendingChoice | null) => void;
};

export const useChoiceStore = create<ChoiceStore>((set) => ({
  pending: null,
  setPending: (pending) => set({ pending }),
}));

export const AskUserChoiceUI = makeAssistantToolUI<AskUserChoiceArgs, string>({
  toolName: "askUserChoice",
  render: function AskUserChoiceRender({ args, status, addResult }) {
    const setPending = useChoiceStore((s) => s.setPending);
    const addResultRef = useRef(addResult);
    addResultRef.current = addResult;

    useEffect(() => {
      if (status.type !== "complete" && args.question && args.choices) {
        setPending({
          question: args.question,
          choices: args.choices,
          addResult: (result: string) => addResultRef.current(result),
        });
      }
    }, [args.question, args.choices, status.type, setPending]);

    return null;
  },
});

const toolDisplayNames: Record<string, string> = {
  saveTasks: "Saving Tasks",
  saveMemory: "Saving Memory",
  readMemories: "Reading Memories",
  listMemoryQuestions: "Listing Memories",
  searchMemoryAnswer: "Searching Memory",
  setChatTitle: "Setting Title",
  askUserChoice: "Asking Question",
};

export function ToolCallBox(props: ToolCallMessagePartProps) {
  const { toolName, status, isError } = props;
  const displayName = toolDisplayNames[toolName] || toolName;
  const isRunning =
    status.type === "running" || status.type === "requires-action";
  const isComplete = status.type === "complete";

  return (
    <div className="flex items-center gap-2 px-3 py-2 mt-2 rounded-lg bg-muted/50 border border-border text-sm text-muted-foreground">
      <WrenchIcon className="size-3.5 shrink-0" />
      <span className="flex-1">{displayName}</span>
      {isRunning && (
        <Loader2Icon className="size-3.5 animate-spin text-blue-500" />
      )}
      {isComplete && !isError && (
        <CheckCircle2Icon className="size-3.5 text-green-500" />
      )}
      {isError && <XCircleIcon className="size-3.5 text-red-500" />}
    </div>
  );
}
