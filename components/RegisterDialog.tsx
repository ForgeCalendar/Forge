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
import {
  generateSalt,
  deriveKey,
  exportKeyToString,
} from "@/lib/crypto/client";

type RegisterDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRegisterSuccess: (email: string) => void;
};

export default function RegisterDialog({
  open,
  onOpenChange,
  onRegisterSuccess,
}: RegisterDialogProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const { textMuted: dialogTextColor, textError: errorColor } =
    useThemeTokens();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      // Step 1: Generate a cryptographically secure salt on the client
      const salt = generateSalt();

      // Step 2: Derive authkey from password and salt
      const authKeyObj = await deriveKey(password, salt, "authentication");
      const authkey = await exportKeyToString(authKeyObj);

      // Step 2.5: Derive chatapi key (for encrypting API keys in browser)
      const chatApiKeyObj = await deriveKey(password, salt, "chatapi");
      const chatApiKey = await exportKeyToString(chatApiKeyObj);

      // Step 3: Send email, authkey, and salt to server
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, authkey, salt }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Registration failed");
        setIsLoading(false);
        return;
      }

      // Registration successful - user is automatically logged in by backend
      // Store chatapi key in sessionStorage for encrypting API keys
      sessionStorage.setItem("chatapi_key_material", chatApiKey);

      onRegisterSuccess(data.user.email);
      setEmail("");
      setPassword("");
      setError("");
      onOpenChange(false);
    } catch (err) {
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
              <Dialog.Title>Create Account</Dialog.Title>
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
                      placeholder="Min. 8 characters"
                      disabled={isLoading}
                      minLength={8}
                    />
                    <Field.HelperText fontSize="xs" color={dialogTextColor}>
                      Password must be at least 8 characters
                    </Field.HelperText>
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
                      {isLoading ? "Creating account..." : "Create Account"}
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
