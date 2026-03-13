"use client";
import {
  Box,
  Flex,
  Heading,
  Text,
  Button,
  VStack,
  HStack,
} from "@chakra-ui/react";
import { useColorModeValue } from "@/components/ui/color-mode";
import { useThemeTokens } from "@/lib/theme-tokens";

interface WelcomeScreenProps {
  onLoginClick: () => void;
  onRegisterClick: () => void;
}

export default function WelcomeScreen({
  onLoginClick,
  onRegisterClick,
}: WelcomeScreenProps) {
  const { textHeading: headingColor, textMuted: textColor, textAccent: accentColor } = useThemeTokens();
  const bgGradient = useColorModeValue(
    "linear(to-br, gray.50, white)",
    "linear(to-br, gray.900, gray.800)"
  );

  return (
    <Flex
      minH="100vh"
      align="center"
      justify="center"
      bgGradient={bgGradient}
      px={4}
    >
      <VStack gap={6} maxW="600px" textAlign="center">
        <Heading
          as="h1"
          fontSize={{ base: "4xl", md: "6xl" }}
          fontWeight="bold"
          color={headingColor}
          letterSpacing="tight"
        >
          Forge
        </Heading>

        <Text
          fontSize={{ base: "lg", md: "xl" }}
          color={textColor}
          maxW="500px"
          lineHeight="tall"
        >
          Build your future, one block at a time. Organize your goals and
          schedule with clarity.
        </Text>

        <HStack gap={4} mt={4}>
          <Button
            size="lg"
            colorScheme="blue"
            onClick={onRegisterClick}
            px={8}
            py={6}
            fontSize="lg"
            _hover={{
              transform: "translateY(-2px)",
              shadow: "lg",
            }}
            transition="all 0.2s"
          >
            Get Started
          </Button>
          <Button
            size="lg"
            variant="outline"
            colorScheme="blue"
            onClick={onLoginClick}
            px={8}
            py={6}
            fontSize="lg"
            _hover={{
              transform: "translateY(-2px)",
              shadow: "lg",
            }}
            transition="all 0.2s"
          >
            Login
          </Button>
        </HStack>

        <Text fontSize="sm" color={textColor} opacity={0.8} mt={2}>
          Create an account or sign in to access your calendar and goals
        </Text>
      </VStack>
    </Flex>
  );
}
