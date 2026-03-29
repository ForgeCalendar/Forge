import { Badge } from "@chakra-ui/react";

type ChatRoleBadgeProps = {
  role: string;
  size?: "xs" | "sm" | "md" | "lg";
};

const roleConfig: Record<string, { label: string; colorPalette: string }> = {
  GoalPlanner: {
    label: "Goal Planner",
    colorPalette: "purple",
  },
  Assistant: {
    label: "Assistant",
    colorPalette: "blue",
  },
};

export function ChatRoleBadge({
  role,
  size = "sm",
}: ChatRoleBadgeProps): React.ReactElement | null {
  const config = roleConfig[role];
  if (!config) return null;

  return (
    <Badge size={size} colorPalette={config.colorPalette}>
      {config.label}
    </Badge>
  );
}
