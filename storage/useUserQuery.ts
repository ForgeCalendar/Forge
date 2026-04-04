import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// Types
export interface User {
  id: string;
  timezone: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateUserInput {
  timezone?: string;
}

// Query keys
export const userKeys = {
  current: ["user", "current"] as const,
};

// API functions
async function fetchUser(): Promise<User> {
  const response = await fetch("/api/user");
  if (!response.ok) throw new Error("Failed to fetch user");
  return response.json();
}

async function updateUser(input: UpdateUserInput): Promise<User> {
  const response = await fetch("/api/user", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error("Failed to update user");
  return response.json();
}

// Hooks
export function useUserQuery() {
  return useQuery({
    queryKey: userKeys.current,
    queryFn: fetchUser,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useUpdateUserMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateUser,
    onSuccess: (updatedUser) => {
      // Update the cache with the new user data
      queryClient.setQueryData(userKeys.current, updatedUser);
    },
  });
}
