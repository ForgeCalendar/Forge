"use client";

import { create } from "zustand";
import { makeAssistantToolUI } from "@assistant-ui/react";
import type { ToolCallMessagePartProps } from "@assistant-ui/react";
import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useQueryState } from "nuqs";
import { eventKeys } from "@/storage/useEventsQuery";
import {
  Loader2Icon,
  CheckCircle2Icon,
  XCircleIcon,
  WrenchIcon,
  CalendarIcon,
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

type SuggestEventsArgs = {
  tasks: Array<{
    title: string;
    start: string;
    end: string;
  }>;
};

type SuggestEventsResult = {
  success: boolean;
  taskCount?: number;
  savedEvents?: Array<{
    title: string;
    start: string;
    end: string;
    minutesEstimate: number;
  }>;
  error?: string;
};

function EventThumbnail({
  title,
  start,
  end,
}: {
  title: string;
  start: string;
  end: string;
}) {
  const [, setView] = useQueryState("view");
  const [, setDate] = useQueryState("date");

  const startDate = new Date(start);
  const endDate = new Date(end);

  const dateStr = startDate.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
  const startTime = startDate.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  const endTime = endDate.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });

  const handleClick = () => {
    setView("timeGridDay");
    setDate(startDate.toISOString().slice(0, 10));
  };

  return (
    <div
      className="flex items-center gap-2 px-2 py-1 rounded border border-border bg-background text-xs cursor-pointer hover:bg-muted transition-colors"
      title={`${title}: ${dateStr} ${startTime}-${endTime}`}
      onClick={handleClick}
    >
      <span className="text-orange-500 font-medium whitespace-nowrap">
        {dateStr}
      </span>
      <span className="truncate max-w-24">{title}</span>
      <span className="text-muted-foreground whitespace-nowrap">
        {startTime}
      </span>
    </div>
  );
}

export const SuggestEventsUI = makeAssistantToolUI<
  SuggestEventsArgs,
  SuggestEventsResult
>({
  toolName: "suggestEvents",
  render: function SuggestEventsRender({ args, status }) {
    const queryClient = useQueryClient();
    const tasks = args.tasks || [];
    const isRunning =
      status.type === "running" || status.type === "requires-action";
    const isComplete = status.type === "complete";

    useEffect(() => {
      if (isComplete) {
        queryClient.invalidateQueries({ queryKey: eventKeys.all });
      }
    }, [isComplete, queryClient]);

    if (tasks.length === 0) {
      return null;
    }

    return (
      <div className="mt-3 mb-2 min-w-0">
        <div className="flex items-center gap-2 mb-2 text-sm text-muted-foreground">
          <CalendarIcon className="size-4 shrink-0" />
          <span>Suggested Events ({tasks.length})</span>
          {isRunning && (
            <Loader2Icon className="size-3.5 animate-spin text-blue-500 shrink-0" />
          )}
          {isComplete && (
            <CheckCircle2Icon className="size-3.5 text-green-500 shrink-0" />
          )}
        </div>
        <div className="rounded border border-border p-2 bg-muted/30 overflow-x-hidden overflow-y-auto max-h-28">
          <div className="flex flex-col gap-1">
            {tasks.map((task, idx) => (
              <EventThumbnail
                key={idx}
                title={task.title}
                start={task.start}
                end={task.end}
              />
            ))}
          </div>
        </div>
      </div>
    );
  },
});

const toolDisplayNames: Record<string, string> = {
  suggestEvents: "Suggesting Events",
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
