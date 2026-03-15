"use client";
import { Box, Flex } from "@chakra-ui/react";
import FullCalendar from "@fullcalendar/react";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import CalendarView from "@/components/CalendarView";
import LoginDialog from "@/components/LoginDialog";
import RegisterDialog from "@/components/RegisterDialog";
import WelcomeScreen from "@/components/WelcomeScreen";
import GoalDecomposeDialog from "@/components/GoalDecomposeDialog";
import { useState, useRef } from "react";
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
  const [decomposeGoal, setDecomposeGoal] = useState<{
    id: string;
    title: string;
    description: string;
    dueDate: string | null;
    chatHistoryId?: string | null;
    mode: "create" | "update";
  } | null>(null);
  const [currentView, setCurrentView] = useState<string[]>(["timeGridDay"]);
  const [calendarTitle, setCalendarTitle] = useState("");
  const calendarRef = useRef<FullCalendar>(null);

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
      setDecomposeGoal({
        id: created.id,
        title: created.title,
        description: created.description,
        dueDate: created.dueDate,
        mode: "create",
      });
    } catch (error) {
      console.error("Failed to create goal:", error);
    }
  };

  const handleRemoveGoal = async (index: number) => {
    try {
      const goalToDelete = goals[index];
      if ("id" in goalToDelete) {
        await deleteGoal(goalToDelete.id);
      }
    } catch (error) {
      console.error("Failed to delete goal:", error);
    }
  };

  const handleUpdateGoal = (goal: GoalWithId) => {
    setDecomposeGoal({
      id: goal.id,
      title: goal.title,
      description: goal.description,
      dueDate: goal.dueDate,
      chatHistoryId: goal.chatHistoryId,
      mode: "update",
    });
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
        />
        <CalendarView
          calendarRef={calendarRef}
          currentView={currentView}
          setCurrentView={setCurrentView}
          onTitleChange={setCalendarTitle}
        />
      </Flex>

      {decomposeGoal && (
        <GoalDecomposeDialog
          goalId={decomposeGoal.id}
          goalTitle={decomposeGoal.title}
          goalDescription={decomposeGoal.description}
          dueDate={decomposeGoal.dueDate}
          chatHistoryId={decomposeGoal.chatHistoryId}
          open={true}
          onClose={() => setDecomposeGoal(null)}
          mode={decomposeGoal.mode}
        />
      )}
    </Box>
  );
}
