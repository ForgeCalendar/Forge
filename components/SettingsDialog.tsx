import { Box, Button, Dialog, Portal, Heading, Text } from "@chakra-ui/react";
import SettingsButton from "./SettingsButton";
import { useState } from "react";
import { sampleInfoTags } from "../states/InfoTag";
import { InfoTagComponent } from "./InfoTagComponent";
import { ChatboxComponent } from "@/components/Chatbox";
import { useThemeTokens } from "@/lib/theme-tokens";
import { tagEditorPrompt } from "@/components/prompts";
import AccountSettingsPane from "./AccountSettingsPane";
import CalendarSettingsPane from "./CalendarSettingsPane";

function InfoTagSettingsPane() {
  const [selectedTag, setSelectedTag] = useState<
    (typeof sampleInfoTags)[number] | null
  >(null);
  const {
    textMuted: subtitleColor,
    bgSurface: cardBg,
    border: cardBorder,
    textSecondary: placeholderColor,
  } = useThemeTokens();
  const infoTextColor = subtitleColor;

  return (
    <Box>
      <Text fontWeight="semibold">Info Tags</Text>
      <Text color={subtitleColor} mt={2}>
        Manage and customize your information tags.
      </Text>

      <Box
        mt={6}
        display="flex"
        flexDirection={{ base: "column", md: "row" }}
        gap={6}
      >
        <Box flex={1}>
          <Text fontWeight="medium" mb={3}>
            Available Tags
          </Text>
          <Box display="flex" gap={2} flexWrap="wrap">
            {sampleInfoTags.map((tag) => (
              <Box key={tag.title}>
                <InfoTagComponent
                  tag={tag}
                  onClick={() => setSelectedTag(tag)}
                />
              </Box>
            ))}
          </Box>
        </Box>

        <Box flex={1} minH="420px">
          <Box
            borderWidth="1px"
            borderColor={cardBorder}
            borderRadius="lg"
            bg={cardBg}
            p={4}
            height="100%"
            display="flex"
            flexDirection="column"
            minH="420px"
          >
            {selectedTag ? (
              <>
                <Heading as="h3" size="md">
                  {selectedTag.title}
                </Heading>
                <Text color={infoTextColor} mt={2}>
                  {selectedTag.info}
                </Text>
                <Box
                  mt={4}
                  flex={1}
                  minH="0"
                  display="flex"
                  flexDirection="column"
                >
                  <ChatboxComponent
                    name={selectedTag.title}
                    systemPrompt={tagEditorPrompt(selectedTag.title)}
                    summaryPrompt={
                      "Please summarize the key points about " +
                      selectedTag.title +
                      " from our conversation."
                    }
                  />
                </Box>
              </>
            ) : (
              <Box
                flex={1}
                display="flex"
                alignItems="center"
                justifyContent="center"
              >
                <Text color={placeholderColor}>
                  Select a tag to view details and chat.
                </Text>
              </Box>
            )}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

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
    InformationTags: <InfoTagSettingsPane />,
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
    Account: <AccountSettingsPane />,
  };

  const [selected, setSelected] = useState("General" as keyof typeof panes);
  const menuItems = Object.keys(panes) as Array<keyof typeof panes>;

  return (
    <Dialog.Root size="lg">
      <Dialog.Trigger asChild>
        <SettingsButton />
      </Dialog.Trigger>

      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content maxW="960px" bg={bodyBg}>
            <Dialog.Header>
              <Dialog.Title>Settings</Dialog.Title>
            </Dialog.Header>

            <Dialog.Body>
              {/* Two-column layout: left menu and right content */}
              <Box display="flex" gap={6} p={3} minWidth="600px">
                <Box width="200px" flexShrink={0}>
                  <Box as="nav">
                    {menuItems.map((item) => (
                      <Button
                        key={item}
                        variant="ghost"
                        justifyContent="flex-start"
                        width="100%"
                        mb={1}
                        bg={item === selected ? menuBgActive : menuBg}
                        onClick={() => setSelected(item)}
                      >
                        {item}
                      </Button>
                    ))}
                  </Box>
                </Box>

                <Box flex={1}>{panes[selected] ?? null}</Box>
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
