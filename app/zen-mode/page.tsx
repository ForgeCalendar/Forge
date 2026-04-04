"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, useRef, Suspense } from "react";
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
  Input,
  IconButton,
} from "@chakra-ui/react";
import { useRouter } from "next/navigation";
import { useThemeTokens } from "@/lib/theme-tokens";
import type { EventWithId } from "@/storage/types";
import { ChatboxComponent } from "@/components/Chatbox";
import {
  IoPlaySkipBack,
  IoPlay,
  IoPause,
  IoPlaySkipForward,
} from "react-icons/io5";

function ZenModeContent() {
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
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [tracks, setTracks] = useState<typeof originalTracks>([]);

  const { bgSurface, textHeading, textMuted, textSecondary } = useThemeTokens();

  // Focus music tracks from Pixabay (original order)
  const originalTracks = [
    {
      name: "Deep Thinking",
      url: "/music/absolutesound-deep-thinking-lofi-music-510766.mp3",
    },
    {
      name: "Lofi Chill Girl",
      url: "/music/absolutesound-lofi-chill-lofi-girl-510773.mp3",
    },
    {
      name: "Sad Emotional",
      url: "/music/absolutesound-sad-emotional-lofi-510771.mp3",
    },
    {
      name: "Chill Background",
      url: "/music/aventure-lofi-chill-background-music-508269.mp3",
    },
    {
      name: "Nostalgic Chill",
      url: "/music/aventure-lofi-chill-nostalgic-469629.mp3",
    },
    {
      name: "Urban Chill",
      url: "/music/aventure-lofi-urban-chill-music-478919.mp3",
    },
    { name: "Chill Beat", url: "/music/bfcmusic-lofi-chill-beat-493668.mp3" },
    { name: "Lo-Fi", url: "/music/bfcmusic-lofi-lo-fi-511230.mp3" },
    { name: "Lofi Chill 2", url: "/music/delosound-lofi-chill-2-466475.mp3" },
    {
      name: "Lofi Girl Study",
      url: "/music/delosound-lofi-lofi-chill-lofi-girl-456265.mp3",
    },
    {
      name: "Lofi Girl Chill",
      url: "/music/delosound-lofi-lofi-chill-lofi-girl-466467.mp3",
    },
    {
      name: "Lofi Study Mix",
      url: "/music/delosound-lofi-lofi-chill-lofi-girl-471138.mp3",
    },
    {
      name: "Study Focus",
      url: "/music/delosound-lofi-lofi-chill-lofi-girl-study-480208.mp3",
    },
    {
      name: "Lofi Vibes",
      url: "/music/freemusicforvideo-lofi-lofi-chill-lofi-girl-504905.mp3",
    },
    {
      name: "Coffee Time",
      url: "/music/lofi_music_library-coffee-lofi-chill-lofi-ambient-458901.mp3",
    },
    {
      name: "Coffee Ambient",
      url: "/music/lofi_music_library-coffee-lofi-lofi-music-chill-ambient-458900.mp3",
    },
    {
      name: "Lofi Rain",
      url: "/music/lofi_music_library-lofi-rain-lofi-music-458077.mp3",
    },
    {
      name: "Cozy Background",
      url: "/music/lofidreams-cozy-lofi-background-music-457199.mp3",
    },
    { name: "Monda Chill", url: "/music/mondamusic-lofi-chill-487321.mp3" },
    {
      name: "Monda Relax",
      url: "/music/mondamusic-lofi-chill-chill-487317.mp3",
    },
    {
      name: "Lofi Chill Music",
      url: "/music/musicforpeople-lofi-chill-music-492001.mp3",
    },
    {
      name: "Sentimental Jazz",
      url: "/music/sonican-lo-fi-music-loop-sentimental-jazzy-love-473154.mp3",
    },
  ];

  // Shuffle tracks on mount
  useEffect(() => {
    const shuffled = [...originalTracks];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    setTracks(shuffled);
  }, []);

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
        // Use existing TaskHelper chat or create a new one
        if (data.chatHistoryId) {
          setChatId(data.chatHistoryId);
        } else {
          createTaskHelperChat(data.title);
        }
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

      // Associate the chat with the event BEFORE rendering the chat UI
      if (eventId) {
        await fetch(`/api/events/${eventId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chatHistoryId: chat.id }),
        });
      }

      // Only set chatId after the association is complete
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
      const endTime = new Date(event.end!);
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

  // Load track when currentTrack changes
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || tracks.length === 0) return;

    const wasPlaying = !audio.paused;

    // Load current track
    audio.src = tracks[currentTrack].url;
    audio.load();

    // Resume playing if it was playing before
    if (wasPlaying) {
      audio.play().catch((err) => console.error("Audio play error:", err));
    }

    // Auto-play next track when current ends
    const handleEnded = () => {
      setCurrentTrack((prev) => (prev + 1) % tracks.length);
    };

    audio.addEventListener("ended", handleEnded);
    return () => {
      audio.removeEventListener("ended", handleEnded);
    };
  }, [currentTrack, tracks]);

  // Handle play/pause state
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || tracks.length === 0) return;

    if (isPlaying) {
      // Ensure audio has a source before playing
      if (!audio.src) {
        audio.src = tracks[currentTrack].url;
        audio.load();
      }
      audio.play().catch((err) => console.error("Audio play error:", err));
    } else {
      audio.pause();
    }
  }, [isPlaying, currentTrack, tracks]);

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handlePrevious = () => {
    setCurrentTrack((prev) => (prev > 0 ? prev - 1 : tracks.length - 1));
  };

  const handleNext = () => {
    setCurrentTrack((prev) => (prev + 1) % tracks.length);
  };

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
    <Box h="100vh" bg={bgSurface} display="flex" flexDirection="column">
      <Grid
        templateColumns={{ base: "1fr", lg: "1fr 1fr" }}
        flex={1}
        minH={0}
        gap={0}
        overflow="hidden"
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
                      {formatTime(event.start!)}
                    </Text>
                  </Box>
                  <Box>
                    <Text fontSize="sm" color={textSecondary}>
                      Ends
                    </Text>
                    <Text fontSize="md" color={textHeading}>
                      {formatTime(event.end!)}
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

            {/* Music Player */}
            <Box
              bg="gray.50"
              _dark={{ bg: "gray.900" }}
              borderRadius="lg"
              p={4}
            >
              <VStack gap={3} align="stretch">
                <Text
                  fontSize="sm"
                  fontWeight="semibold"
                  color={textHeading}
                  textAlign="center"
                >
                  🎵{" "}
                  {tracks.length > 0 ? tracks[currentTrack].name : "Loading..."}
                </Text>
                <HStack gap={3} justify="center">
                  <IconButton
                    aria-label="Previous track"
                    borderRadius="full"
                    size="lg"
                    variant="outline"
                    onClick={handlePrevious}
                    _hover={{
                      bg: "gray.200",
                      transform: "scale(1.1)",
                      _dark: { bg: "gray.700" },
                    }}
                    transition="all 0.2s"
                  >
                    <IoPlaySkipBack />
                  </IconButton>
                  <IconButton
                    aria-label={isPlaying ? "Pause" : "Play"}
                    borderRadius="full"
                    size="lg"
                    colorScheme={isPlaying ? "red" : "green"}
                    onClick={handlePlayPause}
                    _hover={{ transform: "scale(1.1)" }}
                    transition="all 0.2s"
                  >
                    {isPlaying ? <IoPause /> : <IoPlay />}
                  </IconButton>
                  <IconButton
                    aria-label="Next track"
                    borderRadius="full"
                    size="lg"
                    variant="outline"
                    onClick={handleNext}
                    _hover={{
                      bg: "gray.200",
                      transform: "scale(1.1)",
                      _dark: { bg: "gray.700" },
                    }}
                    transition="all 0.2s"
                  >
                    <IoPlaySkipForward />
                  </IconButton>
                </HStack>
                {/* Hidden audio element */}
                <audio ref={audioRef} preload="metadata" />
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
          overflow="hidden"
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
            <ChatboxComponent name="Task Helper" chatHistoryId={chatId} />
          )}
        </Box>
      </Grid>
    </Box>
  );
}

export default function ZenModePage() {
  const { bgSurface, textMuted } = useThemeTokens();

  return (
    <Suspense
      fallback={
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
      }
    >
      <ZenModeContent />
    </Suspense>
  );
}
