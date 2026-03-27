"use client";

import { create } from "zustand";
import { makeAssistantToolUI } from "@assistant-ui/react";
import { useEffect, useRef } from "react";

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
