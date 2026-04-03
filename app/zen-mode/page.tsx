"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Box,
  Container,
  Heading,
  Text,
  Button,
  VStack,
  HStack,
  Spinner,
  Grid,
} from "@chakra-ui/react";
import { useRouter } from "next/navigation";
import { useThemeTokens } from "@/lib/theme-tokens";
import type { EventWithId } from "@/storage/types";
import { ChatboxComponent } from "@/components/Chatbox";

export default function ZenModePage() {
  const searchParams = useSearchParams();
  const eventId = searchParams.get("eventId");
  const router = useRouter();
  const [event, setEvent] = useState<EventWithId | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<string>("");
  const [isComplete, setIsComplete] = useState(false);
  const [chatId, setChatId] = useState<string | null>(null);
  const [creatingChat, setCreatingChat] = useState(false);

  const { bgSurface, textHeading, textMuted, textSecondary } = useThemeTokens();

  useEffect(() => {
    if (!eventId) {
      setError("No event ID provided");
      setLoading(false);
      return;
    }

    // Fetch event details
    fetch(`/api/events/${eventId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch event");
        return res.json();
      })
      .then((data) => {
        setEvent(data);
        setLoading(false);
        // Create or find a TaskHelper chat for this event
        createTaskHelperChat(data.title);
      })
      .catch((err) => {
        setError(err.message || "Failed to load event");
        setLoading(false);
      });
  }, [eventId]);

  const createTaskHelperChat = async (eventTitle: string) => {
    setCreatingChat(true);
    try {
      const response = await fetch("/api/chat-history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: "TaskHelper",
          title: `Task: ${eventTitle}`,
        }),
      });

      if (!response.ok) throw new Error("Failed to create chat");

      const chat = await response.json();
      setChatId(chat.id);
    } catch (err) {
      console.error("Failed to create TaskHelper chat:", err);
    } finally {
      setCreatingChat(false);
    }
  };

  useEffect(() => {
    if (!event?.end) return;

    const updateTimer = () => {
      const now = new Date();
      const endTime = new Date(event.end);
      const diff = endTime.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeRemaining("Time's up!");
        setIsComplete(true);
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      if (hours > 0) {
        setTimeRemaining(
          `${hours}:${minutes.toString().padStart(2, "0")}:${seconds
            .toString()
            .padStart(2, "0")}`
        );
      } else {
        setTimeRemaining(`${minutes}:${seconds.toString().padStart(2, "0")}`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [event]);

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleComplete = async () => {
    if (!eventId) return;

    try {
      await fetch(`/api/events/${eventId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: true }),
      });
      router.push("/");
    } catch (err) {
      console.error("Failed to mark event as complete:", err);
    }
  };

  const handleExit = () => {
    router.push("/");
  };

  if (loading) {
    return (
      <Box
        minH="100vh"
        display="flex"
        alignItems="center"
        justifyContent="center"
        bg={bgSurface}
      >
        <VStack gap={4}>
          <Spinner size="xl" />
          <Text color={textMuted}>Loading zen mode...</Text>
        </VStack>
      </Box>
    );
  }

  if (error || !event) {
    return (
      <Box
        minH="100vh"
        display="flex"
        alignItems="center"
        justifyContent="center"
        bg={bgSurface}
      >
        <VStack gap={4}>
          <Text color="red.500" fontSize="lg">
            {error || "Event not found"}
          </Text>
          <Button onClick={handleExit}>Return to Calendar</Button>
        </VStack>
      </Box>
    );
  }

  return (
    <Box minH="100vh" bg={bgSurface} display="flex" flexDirection="column">
      <Grid
        templateColumns={{ base: "1fr", lg: "1fr 1fr" }}
        flex={1}
        minH={0}
        gap={0}
      >
        {/* Left side: Task Info */}
        <Box
          overflowY="auto"
          p={{ base: 4, md: 8 }}
          borderRight={{ base: "none", lg: "1px" }}
          borderBottom={{ base: "1px", lg: "none" }}
          borderColor="gray.200"
          _dark={{ borderColor: "gray.700" }}
        >
          <VStack gap={6} align="stretch" maxW="600px" mx="auto">
            {/* Header */}
            <Box textAlign="center">
              <Heading size="2xl" color={textHeading} mb={2}>
                Zen Mode
              </Heading>
              <Text color={textMuted} fontSize="lg">
                Focus on your task
              </Text>
            </Box>

            {/* Timer */}
            <Box
              bg="gray.100"
              _dark={{ bg: "gray.800" }}
              borderRadius="xl"
              p={12}
              textAlign="center"
            >
              <Text
                fontSize="7xl"
                fontWeight="bold"
                fontFamily="mono"
                color={isComplete ? "green.500" : textHeading}
                lineHeight="1"
              >
                {timeRemaining}
              </Text>
            </Box>

            {/* Event Details */}
            <Box
              bg="gray.50"
              _dark={{ bg: "gray.900" }}
              borderRadius="lg"
              p={6}
            >
              <VStack gap={4} align="stretch">
                <Box>
                  <Text fontSize="sm" color={textSecondary} mb={1}>
                    Current Task
                  </Text>
                  <Heading size="lg" color={textHeading}>
                    {event.title}
                  </Heading>
                </Box>

                <HStack justify="space-between">
                  <Box>
                    <Text fontSize="sm" color={textSecondary}>
                      Started
                    </Text>
                    <Text fontSize="md" color={textHeading}>
                      {formatTime(event.start)}
                    </Text>
                  </Box>
                  <Box>
                    <Text fontSize="sm" color={textSecondary}>
                      Ends
                    </Text>
                    <Text fontSize="md" color={textHeading}>
                      {formatTime(event.end)}
                    </Text>
                  </Box>
                </HStack>

                {event.kind && (
                  <Box>
                    <Text fontSize="sm" color={textSecondary}>
                      Type: {event.kind}
                    </Text>
                  </Box>
                )}
              </VStack>
            </Box>

            {/* Actions */}
            <HStack gap={4} justify="center">
              <Button
                size="lg"
                colorScheme="green"
                onClick={handleComplete}
                minW="180px"
              >
                Mark Complete
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={handleExit}
                minW="180px"
              >
                Exit Zen Mode
              </Button>
            </HStack>

            {/* Motivational Message */}
            {!isComplete && (
              <Box textAlign="center" pt={4}>
                <Text color={textMuted} fontSize="sm" fontStyle="italic">
                  Stay focused. You've got this!
                </Text>
              </Box>
            )}

            {isComplete && (
              <Box textAlign="center" pt={4}>
                <Text color="green.500" fontSize="xl" fontWeight="bold">
                  🎉 Great work! Time to take a break.
                </Text>
              </Box>
            )}
          </VStack>
        </Box>

        {/* Right side: Task Helper Chat */}
        <Box
          bg="white"
          _dark={{ bg: "gray.950" }}
          display="flex"
          flexDirection="column"
          minH={0}
          p={6}
        >
          {creatingChat || !chatId ? (
            <Box
              display="flex"
              alignItems="center"
              justifyContent="center"
              flex={1}
            >
              <VStack gap={4}>
                <Spinner size="lg" />
                <Text color={textMuted}>Loading Task Helper...</Text>
              </VStack>
            </Box>
          ) : (
            <ChatboxComponent
              name="Task Helper"
              chatHistoryId={chatId}
              extraParams={{ eventTitle: event.title }}
            />
          )}
        </Box>
      </Grid>
    </Box>
  );
}
