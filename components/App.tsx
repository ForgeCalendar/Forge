"use client";
import {
  Box,
  Flex,
  Drawer,
  Portal,
  CloseButton,
  Button,
} from "@chakra-ui/react";
import type FullCalendar from "@fullcalendar/react";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import SettingsDialog from "@/components/SettingsDialog";
import { ColorModeButton } from "@/components/ui/color-mode";
import CalendarView from "@/components/CalendarView";
import LoginDialog from "@/components/LoginDialog";
import RegisterDialog from "@/components/RegisterDialog";
import WelcomeScreen from "@/components/WelcomeScreen";
import { ChatboxComponent } from "@/components/Chatbox";
import { useState, useRef, useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useThemeTokens } from "@/lib/theme-tokens";
import { useAuth } from "@/hooks/useAuth";
import { useGoals } from "@/storage/hooks";
import type { CreateGoalInput, GoalWithId } from "@/storage/types";

export default function App() {
  const { bgApp: appBg } = useThemeTokens();
  const { user, isLoading: authLoading, login, logout } = useAuth();
  const { goals, create, delete: deleteGoal } = useGoals();
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const [showRegisterDialog, setShowRegisterDialog] = useState(false);
  const [calendarTitle, setCalendarTitle] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const calendarRef = useRef<FullCalendar | null>(null);

  // Close drawer when screen becomes md or larger (sidebar visible)
  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 768px)");
    const handleChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        setDrawerOpen(false);
      }
    };
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

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
    <Box h="100vh" bg={appBg} overflow="hidden">
      <Header
        calendarRef={calendarRef}
        calendarTitle={calendarTitle}
        currentView={currentView}
        setCurrentView={setCurrentView}
        onMenuClick={() => setDrawerOpen(true)}
      />

      <Drawer.Root
        open={drawerOpen}
        onOpenChange={(e) => setDrawerOpen(e.open)}
        placement="start"
      >
        <Portal>
          <Drawer.Backdrop />
          <Drawer.Positioner>
            <Drawer.Content>
              <Drawer.Header borderBottomWidth="1px">
                <Drawer.Title>Menu</Drawer.Title>
                <Drawer.CloseTrigger
                  asChild
                  position="absolute"
                  top={2}
                  right={2}
                >
                  <CloseButton size="sm" />
                </Drawer.CloseTrigger>
              </Drawer.Header>
              <Drawer.Body p={0} display="flex" flexDirection="column">
                <Box flex={1} minH={0} overflowY="auto">
                  <Sidebar
                    goals={goals}
                    onAddGoal={handleAddGoal}
                    onRemoveGoal={handleRemoveGoal}
                    onUpdateGoal={handleUpdateGoal}
                    onChatSelect={(chatHistoryId) => {
                      const params = new URLSearchParams(
                        searchParams.toString()
                      );
                      params.set("chatId", chatHistoryId);
                      router.push(`${pathname}?${params.toString()}`);
                      setDrawerOpen(false);
                    }}
                    selectedChatId={chatId}
                  />
                </Box>
                <Box
                  p={4}
                  borderTopWidth="1px"
                  borderColor="border"
                  flexShrink={0}
                  display="flex"
                  gap={2}
                >
                  <SettingsDialog />
                  <ColorModeButton aria-label="Toggle dark mode" />
                  {user && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={logout}
                      aria-label="Logout"
                    >
                      Logout
                    </Button>
                  )}
                </Box>
              </Drawer.Body>
            </Drawer.Content>
          </Drawer.Positioner>
        </Portal>
      </Drawer.Root>

      <Flex
        direction={{ base: "column", md: "row" }}
        mx="auto"
        gap={0}
        height="calc(100vh - 53px)"
        overflow="hidden"
      >
        <Box display={{ base: "none", md: "block" }} height="100%">
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
            selectedChatId={chatId}
          />
        </Box>
        {/* Center region - shows when chatId present */}
        {chatId && (
          <Box
            display="flex"
            flex={1}
            borderX={{ base: "none", md: "1px" }}
            borderBottom={{ base: "1px", md: "none" }}
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
        <Box flex={1} minH={0} minW={0} overflow="hidden">
          <CalendarView
            calendarRef={calendarRef}
            currentView={currentView}
            setCurrentView={setCurrentView}
            onTitleChange={setCalendarTitle}
            initialDate={currentDate}
            onCalendarChange={handleCalendarChange}
          />
        </Box>
      </Flex>
    </Box>
  );
}
