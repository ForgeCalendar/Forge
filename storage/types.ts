// Re-export types from states for consistency
export type { Goal, Event } from "../states/goals";
export type { InfoTag } from "../states/InfoTag";
import { Event } from "../states/goals";
import { InfoTag } from "../states/InfoTag";

// API response types with IDs for database records
export interface GoalWithId
  extends Omit<import("../states/goals").Goal, "events" | "infoTags"> {
  id: string;
  chatHistoryId?: string | null;
  events: EventWithId[];
  infoTags: InfoTagWithId[];
}

export interface EventWithId extends Event {
  id: string;
  goalId: string | null;
  chatHistoryId?: string | null;
  userId: string;
  kind: string | null;
  confirmed: boolean;
  order: number;
  metadata: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InfoTagWithId extends InfoTag {
  id: string;
  goalId?: string; // Optional for user-level info tags
}

// Create/Update types (without IDs)
export type CreateGoalInput = {
  title: string;
  description: string;
  dueDate: string | null;
  events: Array<{
    title: string;
    start?: string;
    end?: string;
    completed: boolean;
    minutesEstimate?: number;
  }>;
  infoTags: Array<{
    title: string;
    info: string;
  }>;
};

export type UpdateGoalInput = Partial<CreateGoalInput>;

export type CreateCalendarEventInput = {
  title: string;
  start: Date;
  end: Date;
  extendedProps?: {
    kind?: string;
    goalId?: string;
    goalTitle?: string;
    completed?: boolean;
    minutesEstimate?: number;
  };
};

export type UpdateCalendarEventInput = Partial<CreateCalendarEventInput> & {
  confirmed?: boolean;
  chatHistoryId?: string;
  completed?: boolean;
};

export type CreateInfoTagInput = {
  title: string;
  info: string;
  goalId?: string;
};

export type UpdateInfoTagInput = Partial<Omit<CreateInfoTagInput, "goalId">>;
