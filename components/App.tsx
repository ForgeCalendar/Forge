"use client";
import {
  Box,
  Flex,
  Heading,
  Text,
  Button,
  Select,
  createListCollection,
  Dialog,
  Portal,
  CloseButton,
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
import GoalDecomposeDialog from "@/components/GoalDecomposeDialog";
import { useState, useRef, useEffect } from "react";
import { ColorModeButton } from "@/components/ui/color-mode";
import { useThemeTokens } from "@/lib/theme-tokens";
import { useAuth } from "@/hooks/useAuth";
import { useGoals, useCalendarEvents } from "@/storage/hooks";
import type { CreateGoalInput, GoalWithId } from "@/storage/types";

function Header({
  calendarRef,
  calendarTitle,
  currentView,
  setCurrentView,
}: {
  calendarRef: React.RefObject<FullCalendar | null>;
  calendarTitle: string;
  currentView: string[];
  setCurrentView: (v: string[]) => void;
}) {
  const {
    bgSurface: headerBg,
    border: borderColor,
    textHeading: headingColor,
    textMuted: subheadingColor,
  } = useThemeTokens();
  const { user, logout, login } = useAuth();
  const [showLoginDialog, setShowLoginDialog] = useState(false);

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
            <Button
              size="xs"
              variant="outline"
              onClick={goPrev}
              aria-label="Previous"
            >
              &lt;
            </Button>
            <Button size="xs" variant="outline" onClick={goToday}>
              Today
            </Button>
            <Button
              size="xs"
              variant="outline"
              onClick={goNext}
              aria-label="Next"
            >
              &gt;
            </Button>
          </Flex>

          <Text
            fontWeight="bold"
            fontSize="md"
            color={headingColor}
            minW="150px"
          >
            {calendarTitle}
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
  onTitleChange,
}: {
  calendarRef: React.RefObject<FullCalendar | null>;
  currentView: string[];
  setCurrentView: (v: string[]) => void;
  onTitleChange: (title: string) => void;
}) {
  const {
    events: calendarEvents,
    isLoading,
    update: updateCalendarEvent,
    delete: deleteEvent,
  } = useCalendarEvents();
  const [selectedEvent, setSelectedEvent] = useState<{
    id: string;
    title: string;
    kind: string;
    start: Date | null;
    end: Date | null;
  } | null>(null);

  const { textHeading: headingColor, textMuted: subColor } = useThemeTokens();

  useEffect(() => {
    if (calendarRef.current && currentView.length > 0) {
      const calendarApi = calendarRef.current.getApi();
      calendarApi.changeView(currentView[0]);
    }
  }, [calendarRef, currentView]);

  const formatTime = (date: Date | null) => {
    if (!date) return "—";
    return date.toLocaleString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

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
            datesSet={(info) => {
              onTitleChange(info.view.title);
            }}
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
              setSelectedEvent({
                id: info.event.id,
                title: info.event.title,
                kind: info.event.extendedProps?.kind ?? "task",
                start: info.event.start,
                end: info.event.end,
              });
            }}
            eventDrop={async (info) => {
              try {
                await updateCalendarEvent(info.event.id, {
                  start: info.event.start!,
                  end: info.event.end!,
                });
              } catch {
                info.revert();
              }
            }}
            eventResize={async (info) => {
              try {
                await updateCalendarEvent(info.event.id, {
                  start: info.event.start!,
                  end: info.event.end!,
                });
              } catch {
                info.revert();
              }
            }}
          />
        </Box>
      )}

      <Dialog.Root
        open={!!selectedEvent}
        onOpenChange={(e) => {
          if (!e.open) setSelectedEvent(null);
        }}
      >
        <Portal>
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content>
              <Dialog.Header>
                <Dialog.Title>{selectedEvent?.title}</Dialog.Title>
                <Dialog.CloseTrigger asChild>
                  <CloseButton
                    size="sm"
                    position="absolute"
                    top={3}
                    right={3}
                  />
                </Dialog.CloseTrigger>
              </Dialog.Header>
              <Dialog.Body>
                <Flex direction="column" gap={2}>
                  <Flex gap={2}>
                    <Text fontWeight="bold" color={headingColor}>
                      Type:
                    </Text>
                    <Text color={subColor}>{selectedEvent?.kind}</Text>
                  </Flex>
                  <Flex gap={2}>
                    <Text fontWeight="bold" color={headingColor}>
                      Start:
                    </Text>
                    <Text color={subColor}>
                      {formatTime(selectedEvent?.start ?? null)}
                    </Text>
                  </Flex>
                  <Flex gap={2}>
                    <Text fontWeight="bold" color={headingColor}>
                      End:
                    </Text>
                    <Text color={subColor}>
                      {formatTime(selectedEvent?.end ?? null)}
                    </Text>
                  </Flex>
                </Flex>
              </Dialog.Body>
              <Dialog.Footer>
                <Dialog.ActionTrigger asChild>
                  <Button variant="outline" size="sm">
                    Close
                  </Button>
                </Dialog.ActionTrigger>
                <Button
                  colorPalette="red"
                  size="sm"
                  onClick={() => {
                    if (selectedEvent?.id) {
                      deleteEvent(selectedEvent.id);
                      setSelectedEvent(null);
                    }
                  }}
                >
                  Delete Event
                </Button>
              </Dialog.Footer>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>
    </Box>
  );
}

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

  // Show full app if logged in
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
