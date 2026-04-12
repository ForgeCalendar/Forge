"use client";

import { Box, Container, Heading, VStack } from "@chakra-ui/react";
import ApiKeyManager from "@/components/settings/ApiKeyManager";

export default function SettingsPage() {
  return (
    <Container maxW="container.md" py={8}>
      <VStack gap={8} align="stretch">
        <Box>
          <Heading size="lg" mb={2}>
            Settings
          </Heading>
        </Box>

        <ApiKeyManager />
      </VStack>
    </Container>
  );
}
