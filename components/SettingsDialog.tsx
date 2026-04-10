import { Box, Button, Dialog, Portal, Text } from "@chakra-ui/react";
import SettingsButton from "./SettingsButton";
import { useState } from "react";
import { useThemeTokens } from "@/lib/theme-tokens";
import AccountSettingsPane from "./AccountSettingsPane";
import CalendarSettingsPane from "./CalendarSettingsPane";
import MemorySettingsPane from "./MemorySettingsPane";

export default function SettingsDialog() {
  const {
    bgSurface: bodyBg,
    textMuted: subtitleColor,
    bgActiveMenu: menuBgActive,
  } = useThemeTokens();
  const menuBg = "transparent";

  const panes = {
    General: (
      <Box>
        <Text fontWeight="semibold">General</Text>
        <Text color={subtitleColor} mt={2}>
          Basic application preferences and behavior.
        </Text>
      </Box>
    ),
    Appearance: (
      <Box>
        <Text fontWeight="semibold">Appearance</Text>
        <Text color={subtitleColor} mt={2}>
          Theme, density and other UI preferences.
        </Text>
      </Box>
    ),
    Notifications: (
      <Box>
        <Text fontWeight="semibold">Notifications</Text>
        <Text color={subtitleColor} mt={2}>
          Configure notification preferences and integrations.
        </Text>
      </Box>
    ),
    Calendars: <CalendarSettingsPane />,
    Memory: <MemorySettingsPane />,
    Account: <AccountSettingsPane />,
  };

  const [selected, setSelected] = useState("General" as keyof typeof panes);
  const menuItems = Object.keys(panes) as Array<keyof typeof panes>;

  return (
    <Dialog.Root size={{ base: "full", md: "lg" }}>
      <Dialog.Trigger asChild>
        <SettingsButton />
      </Dialog.Trigger>

      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content maxW="960px" bg={bodyBg} mx={{ base: 2, md: "auto" }}>
            <Dialog.Header>
              <Dialog.Title>Settings</Dialog.Title>
            </Dialog.Header>

            <Dialog.Body>
              {/* Two-column on desktop, single-column on mobile */}
              <Box
                display="flex"
                flexDirection={{ base: "column", md: "row" }}
                gap={{ base: 3, md: 6 }}
                p={{ base: 1, md: 3 }}
              >
                <Box width={{ base: "100%", md: "200px" }} flexShrink={0}>
                  <Box
                    as="nav"
                    display="flex"
                    flexDirection={{ base: "row", md: "column" }}
                    flexWrap={{ base: "wrap", md: "nowrap" }}
                    gap={{ base: 1, md: 0 }}
                  >
                    {menuItems.map((item) => (
                      <Button
                        key={item}
                        variant="ghost"
                        justifyContent="flex-start"
                        width={{ base: "auto", md: "100%" }}
                        mb={{ base: 0, md: 1 }}
                        bg={item === selected ? menuBgActive : menuBg}
                        onClick={() => setSelected(item)}
                        size={{ base: "sm", md: "md" }}
                      >
                        {item}
                      </Button>
                    ))}
                  </Box>
                </Box>

                <Box flex={1} minW={0}>
                  {panes[selected] ?? null}
                </Box>
              </Box>
            </Dialog.Body>

            <Dialog.Footer>
              <Dialog.ActionTrigger asChild>
                <Button variant="ghost">Cancel</Button>
              </Dialog.ActionTrigger>
              <Dialog.ActionTrigger asChild>
                <Button colorScheme="blue">Save</Button>
              </Dialog.ActionTrigger>
            </Dialog.Footer>

            <Dialog.CloseTrigger asChild>
              {/* close icon already inside content via CloseTrigger if desired */}
              <Button aria-hidden style={{ display: "none" }} />
            </Dialog.CloseTrigger>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
