export type Event = {
  title: string;
  start?: string; // ISO datetime string
  end?: string; // ISO datetime string
  completed: boolean;
  minutesEstimate?: number;
};

export type Goal = {
  title: string;
  description: string;
  // ISO datetime string (e.g. "2026-01-15T17:00:00" or full ISO with TZ) or null when no due date/time
  dueDate: string | null;
  // Small list of events for the goal
  events: Event[];
};

export const sampleGoals: Goal[] = [
  {
    title: "Finish pre-commit setup",
    description:
      "Finalize and install the repository pre-commit hooks; run autoupdate and fix any reported issues.",
    dueDate: "2026-01-15T17:00:00",
    events: [
      {
        title: "Add .pre-commit-config.yaml",
        completed: true,
        minutesEstimate: 30,
      },
      {
        title: "Run pre-commit install",
        completed: false,
        minutesEstimate: 15,
      },
      {
        title: "Run pre-commit autoupdate",
        completed: false,
        minutesEstimate: 20,
      },
    ],
  },
  {
    title: "Polish frontend layout",
    description:
      "Adjust responsive styles and finalize the main landing section in the React app.",
    dueDate: null,
    events: [
      {
        title: "Fix mobile header spacing",
        completed: true,
        minutesEstimate: 10,
      },
      {
        title: "Adjust hero section spacing",
        completed: false,
        minutesEstimate: 25,
      },
    ],
  },
  {
    title: "Add unit tests for auth",
    description:
      "Write unit tests covering login/logout and token refresh logic.",
    dueDate: "2026-02-01T09:30:00",
    events: [
      { title: "Test login flow", completed: false, minutesEstimate: 40 },
      { title: "Test token refresh", completed: false, minutesEstimate: 35 },
    ],
  },
];
