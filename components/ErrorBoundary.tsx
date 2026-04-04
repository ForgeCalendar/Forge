"use client";

import { Component, type ReactNode } from "react";
import { ErrorBoundary as ReactErrorBoundary } from "react-error-boundary";
import { Box, Button, Heading, Text, VStack } from "@chakra-ui/react";
import { useRouter } from "next/navigation";

interface ErrorFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
}

function ErrorFallback({ error, resetErrorBoundary }: ErrorFallbackProps) {
  const router = useRouter();

  return (
    <Box
      minH="100vh"
      display="flex"
      alignItems="center"
      justifyContent="center"
      p={4}
    >
      <VStack gap={4} maxW="md" textAlign="center">
        <Heading size="lg" color="red.500">
          Something went wrong
        </Heading>
        <Text color="gray.600" _dark={{ color: "gray.400" }}>
          {error.message || "An unexpected error occurred"}
        </Text>
        <VStack gap={2}>
          <Button onClick={resetErrorBoundary} colorScheme="blue">
            Try again
          </Button>
          <Button onClick={() => router.push("/")} variant="outline" size="sm">
            Go to home
          </Button>
        </VStack>
      </VStack>
    </Box>
  );
}

interface ErrorBoundaryProps {
  children: ReactNode;
  onError?: (error: Error, errorInfo: { componentStack: string }) => void;
}

export function ErrorBoundary({ children, onError }: ErrorBoundaryProps) {
  return (
    <ReactErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={onError}
      onReset={() => {
        // Reset any app state here if needed
        window.location.reload();
      }}
    >
      {children}
    </ReactErrorBoundary>
  );
}
