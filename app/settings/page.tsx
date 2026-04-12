"use client";

import { Container, VStack } from "@chakra-ui/react";
import ProviderManager from "@/components/settings/ProviderManager";

export default function SettingsPage() {
  return (
    <Container maxW="container.md" py={8}>
      <VStack gap={8} align="stretch">
        <ProviderManager />
      </VStack>
    </Container>
  );
}
