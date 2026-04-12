"use client";

import {
  Box,
  Button,
  Input,
  Text,
  Dialog,
  Portal,
  CloseButton,
  VStack,
  Field,
} from "@chakra-ui/react";
import { useState } from "react";
import { useThemeTokens } from "@/lib/theme-tokens";
import { deriveKey, exportKeyToString } from "@/lib/crypto/client";

type LoginDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLoginSuccess: (email: string) => void;
};

export default function LoginDialog({
  open,
  onOpenChange,
  onLoginSuccess,
}: LoginDialogProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const { textError: errorColor } = useThemeTokens();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      // Step 1: Fetch the user's salt from the server
      const saltResponse = await fetch(
        `/api/salt?username=${encodeURIComponent(email)}`
      );

      if (!saltResponse.ok) {
        const saltData = await saltResponse.json();
        setError(saltData.error || "Failed to fetch user salt");
        setIsLoading(false);
        return;
      }

      const { salt } = await saltResponse.json();

      // Step 2: Derive authkey from password and salt
      const authKeyObj = await deriveKey(password, salt, "authentication");
      const authkey = await exportKeyToString(authKeyObj);

      // Step 2.5: Derive chatapi key (for encrypting API keys in browser)
      const chatApiKeyObj = await deriveKey(password, salt, "chatapi");
      const chatApiKey = await exportKeyToString(chatApiKeyObj);

      // Step 3: Send email and authkey to login endpoint
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, authkey }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Login failed");
        setIsLoading(false);
        return;
      }

      // Login successful
      // Store chatapi key in sessionStorage for encrypting API keys
      sessionStorage.setItem("chatapi_key_material", chatApiKey);

      onLoginSuccess(data.user.email);
      setEmail("");
      setPassword("");
      setError("");
      onOpenChange(false);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={(e) => onOpenChange(e.open)}>
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>Login</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <form onSubmit={handleSubmit}>
                <VStack gap={4} align="stretch">
                  <Field.Root>
                    <Field.Label>Email</Field.Label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="your@email.com"
                      disabled={isLoading}
                    />
                  </Field.Root>

                  <Field.Root>
                    <Field.Label>Password</Field.Label>
                    <Input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      placeholder="Enter your password"
                      disabled={isLoading}
                    />
                  </Field.Root>

                  {error && (
                    <Text color={errorColor} fontSize="sm">
                      {error}
                    </Text>
                  )}

                  <Box mt={2}>
                    <Button
                      type="submit"
                      colorScheme="blue"
                      width="100%"
                      disabled={isLoading}
                    >
                      {isLoading ? "Logging in..." : "Login"}
                    </Button>
                  </Box>
                </VStack>
              </form>
            </Dialog.Body>
            <Dialog.Footer>
              <Dialog.CloseTrigger asChild>
                <CloseButton size="sm" />
              </Dialog.CloseTrigger>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
