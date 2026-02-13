"use client";
import {
  Box,
  Flex,
  Heading,
  Text,
  Button,
  Select,
  createListCollection,
} from "@chakra-ui/react";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import Sidebar from "@/components/Sidebar";
import SettingsDialog from "@/components/SettingsDialog";
import LoginDialog from "@/components/LoginDialog";
import RegisterDialog from "@/components/RegisterDialog";
import WelcomeScreen from "@/components/WelcomeScreen";
import { useState, useRef, useEffect } from "react";
import { ColorModeButton, useColorModeValue } from "@/components/ui/color-mode";
import { useAuth } from "@/hooks/useAuth";
import { useGoals, useCalendarEvents } from "@/storage/hooks";
import type { CreateGoalInput } from "@/storage/types";

function Header({
  calendarRef,
  currentView,
  setCurrentView,
}: {
  calendarRef: React.RefObject<FullCalendar | null>;
  currentView: string[];
  setCurrentView: (v: string[]) => void;
}) {
  const headerBg = useColorModeValue("white", "gray.900");
  const borderColor = useColorModeValue("gray.200", "gray.700");
  const headingColor = useColorModeValue("gray.900", "gray.50");
  const subheadingColor = useColorModeValue("gray.600", "gray.300");
  const { user, logout, login } = useAuth();
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const [title, setTitle] = useState("");

  useEffect(() => {
    const updateTitle = () => {
      const api = calendarRef.current?.getApi();
      if (api) setTitle(api.view.title);
    };
    updateTitle();
    const interval = setInterval(updateTitle, 200);
    return () => clearInterval(interval);
  }, [calendarRef, currentView]);

  const goToday = () => calendarRef.current?.getApi().today();
  const goPrev = () => calendarRef.current?.getApi().prev();
  const goNext = () => calendarRef.current?.getApi().next();

  return (
    <>
      <Box
        as="header"
        bg={headerBg}
        borderBottomWidth="1px"
        borderBottomColor={borderColor}
        px={4}
        py={2}
      >
        <Flex align="center" gap={3}>
          <Heading as="h1" size="xl" m={0} color={headingColor}>
            Forge
          </Heading>
          <Text opacity={0.7} color={subheadingColor}>
            Calendar
          </Text>

          <Flex align="center" gap={1} ml={4}>
            <Button size="xs" variant="outline" onClick={goPrev} aria-label="Previous">
              &lt;
            </Button>
            <Button size="xs" variant="outline" onClick={goToday}>
              Today
            </Button>
            <Button size="xs" variant="outline" onClick={goNext} aria-label="Next">
              &gt;
            </Button>
          </Flex>

          <Text fontWeight="bold" fontSize="md" color={headingColor} minW="150px">
            {title}
          </Text>

          <Select.Root
            collection={viewOptions}
            value={currentView}
            onValueChange={(e) => setCurrentView(e.value)}
            width="130px"
            size="sm"
            positioning={{ sameWidth: true }}
          >
            <Select.Trigger>
              <Select.ValueText placeholder="Select view" />
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

          <Flex ml="auto" align="center" gap={2}>
            {user ? (
              <>
                <Text fontSize="sm" color={subheadingColor}>
                  {user.email}
                </Text>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={logout}
                  aria-label="Logout"
                >
                  Logout
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                colorScheme="blue"
                onClick={() => setShowLoginDialog(true)}
                aria-label="Login"
              >
                Login
              </Button>
            )}
            <ColorModeButton aria-label="Toggle dark mode" />
            <SettingsDialog />
          </Flex>
        </Flex>
      </Box>
      <LoginDialog
        open={showLoginDialog}
        onOpenChange={setShowLoginDialog}
        onLoginSuccess={login}
      />
    </>
  );
}

// Sidebar moved to its own component in `src/Sidebar.tsx` and receives goals via props.

const viewOptions = createListCollection({
  items: [
    { label: "Month", value: "dayGridMonth" },
    { label: "Week", value: "timeGridWeek" },
    { label: "Day", value: "timeGridDay" },
  ],
});

function CalendarView({
  calendarRef,
  currentView,
  setCurrentView,
}: {
  calendarRef: React.RefObject<FullCalendar | null>;
  currentView: string[];
  setCurrentView: (v: string[]) => void;
}) {
  const {
    events: calendarEvents,
    isLoading,
    delete: deleteEvent,
  } = useCalendarEvents();

  useEffect(() => {
    if (calendarRef.current && currentView.length > 0) {
      const calendarApi = calendarRef.current.getApi();
      calendarApi.changeView(currentView[0]);
    }
  }, [calendarRef, currentView]);

  return (
    <Box flex={1} p={2} height="100%" minHeight={0} overflow="hidden">
      {isLoading ? (
        <Box p={4}>
          <Text>Loading events...</Text>
        </Box>
      ) : (
        <Box minHeight={0} height="100%">
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="timeGridDay"
            headerToolbar={false}
            nowIndicator={true}
            height="100%"
            allDaySlot={false}
            slotDuration="00:30:00"
            slotLabelInterval="01:00"
            expandRows={true}
            weekends={true}
            editable={true}
            eventStartEditable={true}
            eventDurationEditable={true}
            events={calendarEvents}
            dateClick={(info) => {
              if (currentView[0] === "dayGridMonth") {
                const calendarApi = calendarRef.current?.getApi();
                if (calendarApi) {
                  calendarApi.gotoDate(info.dateStr);
                  calendarApi.changeView("timeGridDay");
                  setCurrentView(["timeGridDay"]);
                }
              }
            }}
            eventClick={(info) => {
              const kind = info.event.extendedProps?.kind ?? "task";
              const confirmed = window.confirm(
                `[${kind}] ${info.event.title}\n\nDo you want to delete this event?`
              );
              if (confirmed && info.event.id) {
                deleteEvent(info.event.id);
              }
            }}
            eventDrop={(info) => {
              console.log("eventDrop:", {
                id: info.event.id,
                start: info.event.start,
                end: info.event.end,
              });
            }}
            eventResize={(info) => {
              console.log("eventResize:", {
                id: info.event.id,
                start: info.event.start,
                end: info.event.end,
              });
            }}
          />
        </Box>
      )}
    </Box>
  );
}

export default function App() {
  const appBg = useColorModeValue("gray.50", "gray.900");
  const { user, isLoading: authLoading, login } = useAuth();
  const {
    goals,
    isLoading: goalsLoading,
    create,
    delete: deleteGoal,
  } = useGoals();
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const [showRegisterDialog, setShowRegisterDialog] = useState(false);
  const [currentView, setCurrentView] = useState<string[]>(["timeGridDay"]);
  const calendarRef = useRef<FullCalendar>(null);

  // Show loading state while checking authentication
  if (authLoading) {
    return null;
  }

  // Show welcome screen if not logged in
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
      await create(goal);
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

  // Show full app if logged in
  return (
    <Box minH="100vh" bg={appBg}>
      <Header
        calendarRef={calendarRef}
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
        />
        <CalendarView
          calendarRef={calendarRef}
          currentView={currentView}
          setCurrentView={setCurrentView}
        />
      </Flex>
    </Box>
  );
}
