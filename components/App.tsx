"use client";
import {
  Box,
  Flex,
  Drawer,
  Portal,
  Button,
  Select,
  createListCollection,
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
import { useState, useRef, useEffect, useCallback } from "react";
import { useQueryState } from "nuqs";
import { useThemeTokens } from "@/lib/theme-tokens";
import { useAuth } from "@/hooks/useAuth";
import { useGoals } from "@/storage/hooks";
import type { CreateGoalInput, GoalWithId } from "@/storage/types";

const viewOptions = createListCollection({
  items: [
    { label: "Month", value: "dayGridMonth" },
    { label: "Week", value: "timeGridWeek" },
    { label: "Day", value: "timeGridDay" },
  ],
});

export default function App() {
  const { bgApp: appBg } = useThemeTokens();
  const { user, isLoading: authLoading, login, logout } = useAuth();
  const { goals, create, delete: deleteGoal } = useGoals();
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const [showRegisterDialog, setShowRegisterDialog] = useState(false);
  const [calendarTitle, setCalendarTitle] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [timezone, setTimezone] = useState<string>("local");
  const calendarRef = useRef<FullCalendar | null>(null);

  // Fetch user timezone
  useEffect(() => {
    if (user) {
      fetch("/api/user")
        .then((res) => res.json())
        .then((data) => {
          if (data.timezone) {
            setTimezone(data.timezone);
          }
        })
        .catch(console.error);
    }
  }, [user]);

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

  const [view, setView] = useQueryState("view", {
    defaultValue: "timeGridDay",
  });
  const [date, setDate] = useQueryState("date", {
    defaultValue: new Date().toISOString().slice(0, 10),
  });
  const [chatId, setChatId] = useQueryState("chatId");

  // Wrap view in array for Select component compatibility
  const currentView = [view];
  const setCurrentView = (v: string[]) => setView(v[0]);

  // Sync calendar when URL params change - DISABLED FOR TESTING
  // useEffect(() => {
  //   const calendarApi = calendarRef.current?.getApi();
  //   if (calendarApi) {
  //     calendarApi.changeView(view);
  //     calendarApi.gotoDate(date);
  //   }
  // }, [view, date]);

  const handleCalendarChange = useCallback(
    (newDate: string, newView: string) => {
      setView(newView);
      setDate(newDate);
    },
    [setView, setDate]
  );

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
      setChatId(created.chatHistoryId);
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
          setChatId(null);
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
    setChatId(goal.chatHistoryId);
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
                <Flex align="center" gap={3} flex={1}>
                  <Drawer.Title>Menu</Drawer.Title>
                  <Select.Root
                    collection={viewOptions}
                    value={currentView}
                    onValueChange={(e) => setCurrentView(e.value)}
                    width="110px"
                    size="sm"
                    positioning={{ sameWidth: true }}
                  >
                    <Select.Trigger>
                      <Select.ValueText placeholder="View" />
                    </Select.Trigger>
                    <Select.Positioner>
                      <Select.Content>
                        {viewOptions.items.map((option) => (
                          <Select.Item item={option} key={option.value}>
                            {option.label}
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select.Positioner>
                  </Select.Root>
                </Flex>
              </Drawer.Header>
              <Drawer.Body p={0} display="flex" flexDirection="column">
                <Box flex={1} minH={0} overflowY="auto">
                  <Sidebar
                    goals={goals}
                    onAddGoal={handleAddGoal}
                    onRemoveGoal={handleRemoveGoal}
                    onUpdateGoal={handleUpdateGoal}
                    onChatSelect={(newChatId) => {
                      setChatId(newChatId);
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
            onChatSelect={(newChatId) => {
              setChatId(newChatId);
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
              onClose={() => setChatId(null)}
            />
          </Box>
        )}
        <Box flex={1} minH={0} minW={0} overflow="hidden">
          <CalendarView
            calendarRef={calendarRef}
            currentView={currentView}
            setCurrentView={setCurrentView}
            onTitleChange={setCalendarTitle}
            initialDate={date}
            onCalendarChange={handleCalendarChange}
            timezone={timezone}
          />
        </Box>
      </Flex>
    </Box>
  );
}
