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
import type FullCalendar from "@fullcalendar/react";
import SettingsDialog from "@/components/SettingsDialog";
import LoginDialog from "@/components/LoginDialog";
import type React from "react";
import { useState } from "react";
import { ColorModeButton } from "@/components/ui/color-mode";
import { useThemeTokens } from "@/lib/theme-tokens";
import { useAuth } from "@/hooks/useAuth";

const viewOptions = createListCollection({
  items: [
    { label: "Month", value: "dayGridMonth" },
    { label: "Week", value: "timeGridWeek" },
    { label: "Day", value: "timeGridDay" },
  ],
});

export default function Header({
  calendarRef,
  calendarTitle,
  currentView,
  setCurrentView,
  onMenuClick,
}: {
  calendarRef: React.RefObject<FullCalendar | null>;
  calendarTitle: string;
  currentView: string[];
  setCurrentView: (v: string[]) => void;
  onMenuClick?: () => void;
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
        {/* Disappear when window too small</Box> */}
        <Flex align="center" gap={3}>
          <Button
            size="sm"
            variant="ghost"
            onClick={onMenuClick}
            aria-label="Open menu"
            display={{ base: "flex", md: "none" }}
          >
            ☰
          </Button>
          <Heading
            as="h1"
            size="xl"
            m={0}
            color={headingColor}
            display={{ base: "none", md: "block" }}
          >
            Forge
          </Heading>
          <Text
            opacity={0.7}
            color={subheadingColor}
            display={{ base: "none", md: "block" }}
          >
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
                <Text
                  fontSize="sm"
                  color={subheadingColor}
                  display={{ base: "none", lg: "block" }}
                >
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
