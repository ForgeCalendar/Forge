"use client";
import { Box, Flex } from "@chakra-ui/react";
import type FullCalendar from "@fullcalendar/react";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import CalendarView from "@/components/CalendarView";
import LoginDialog from "@/components/LoginDialog";
import RegisterDialog from "@/components/RegisterDialog";
import WelcomeScreen from "@/components/WelcomeScreen";
import { ChatboxComponent } from "@/components/Chatbox";
import { useState, useRef } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useThemeTokens } from "@/lib/theme-tokens";
import { useAuth } from "@/hooks/useAuth";
import { useGoals } from "@/storage/hooks";
import type { CreateGoalInput, GoalWithId } from "@/storage/types";

export default function App() {
  const { bgApp: appBg } = useThemeTokens();
  const { user, isLoading: authLoading, login } = useAuth();
  const { goals, create, delete: deleteGoal } = useGoals();
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const [showRegisterDialog, setShowRegisterDialog] = useState(false);
  const [calendarTitle, setCalendarTitle] = useState("");
  const calendarRef = useRef<FullCalendar | null>(null);

  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [currentView, setCurrentViewState] = useState<string[]>([
    searchParams.get("view") ?? "timeGridDay",
  ]);
  const [currentDate] = useState<string>(
    searchParams.get("date") ?? new Date().toISOString().slice(0, 10)
  );
  const chatId = searchParams.get("chatId");

  const setCurrentView = (v: string[]) => {
    setCurrentViewState(v);
  };

  const handleCalendarChange = (date: string, view: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", view);
    params.set("date", date);
    router.replace(`${pathname}?${params.toString()}`);
  };

  if (authLoading) {
    return null;
  }

  if (!user) {
    return (
      <>
        <WelcomeScreen
          onLoginClick={() => setShowLoginDialog(true)}
          onRegisterClick={() => setShowRegisterDialog(true)}
        />
        <LoginDialog
          open={showLoginDialog}
          onOpenChange={setShowLoginDialog}
          onLoginSuccess={login}
        />
        <RegisterDialog
          open={showRegisterDialog}
          onOpenChange={setShowRegisterDialog}
          onRegisterSuccess={login}
        />
      </>
    );
  }

  const handleAddGoal = async (goal: CreateGoalInput) => {
    try {
      const created = await create(goal);
      if (!created.chatHistoryId) {
        console.error("Goal created without chatHistoryId");
        return;
      }
      // Navigate to the chat in the center region
      const params = new URLSearchParams(searchParams.toString());
      params.set("chatId", created.chatHistoryId);
      router.push(`${pathname}?${params.toString()}`);
    } catch (error) {
      console.error("Failed to create goal:", error);
    }
  };

  const handleRemoveGoal = async (index: number) => {
    try {
      const goalToDelete = goals[index];
      if ("id" in goalToDelete) {
        // If the current chatId is associated with this goal, remove it from URL
        if (
          chatId &&
          "chatHistoryId" in goalToDelete &&
          goalToDelete.chatHistoryId === chatId
        ) {
          const params = new URLSearchParams(searchParams.toString());
          params.delete("chatId");
          router.push(`${pathname}?${params.toString()}`);
        }
        await deleteGoal(goalToDelete.id);
      }
    } catch (error) {
      console.error("Failed to delete goal:", error);
    }
  };

  const handleUpdateGoal = (goal: GoalWithId) => {
    if (!goal.chatHistoryId) {
      console.error("Cannot update goal without chatHistoryId");
      return;
    }
    // Navigate to the chat in the center region
    const params = new URLSearchParams(searchParams.toString());
    params.set("chatId", goal.chatHistoryId);
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <Box minH="100vh" bg={appBg}>
      <Header
        calendarRef={calendarRef}
        calendarTitle={calendarTitle}
        currentView={currentView}
        setCurrentView={setCurrentView}
      />

      <Flex
        direction={{ base: "column", md: "row" }}
        mx="auto"
        gap={0}
        height="calc(100vh - 53px)"
      >
        <Sidebar
          goals={goals}
          onAddGoal={handleAddGoal}
          onRemoveGoal={handleRemoveGoal}
          onUpdateGoal={handleUpdateGoal}
          onChatSelect={(chatHistoryId) => {
            const params = new URLSearchParams(searchParams.toString());
            params.set("chatId", chatHistoryId);
            router.push(`${pathname}?${params.toString()}`);
          }}
        />
        {/* Center region - hidden on screens smaller than lg or when no chatId */}
        {chatId && (
          <Box
            display={{ base: "none", lg: "flex" }}
            flex={1}
            borderX="1px"
            borderColor="border"
            minW={0}
            minH={0}
            overflow="hidden"
            p={4}
          >
            <ChatboxComponent
              name={`chat-${chatId}`}
              chatHistoryId={chatId}
              extraParams={{ chatHistoryId: chatId }}
              onClose={() => {
                const params = new URLSearchParams(searchParams.toString());
                params.delete("chatId");
                router.push(`${pathname}?${params.toString()}`);
              }}
            />
          </Box>
        )}
        <CalendarView
          calendarRef={calendarRef}
          currentView={currentView}
          setCurrentView={setCurrentView}
          onTitleChange={setCalendarTitle}
          initialDate={currentDate}
          onCalendarChange={handleCalendarChange}
        />
      </Flex>
    </Box>
  );
}
