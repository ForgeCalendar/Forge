import { useColorModeValue } from "@/components/ui/color-mode";

/**
 * Centralized color tokens for light/dark mode.
 *
 * Every component should pull colors from here instead of calling
 * `useColorModeValue` with ad-hoc string pairs. Adding a new semantic
 * color? Put it here so every consumer stays in sync.
 */
export function useThemeTokens() {
  return {
    // --- Text ---
    /** Primary heading text (e.g. page titles, dialog titles) */
    textHeading: useColorModeValue("gray.900", "gray.50"),
    /** Body / muted text (descriptions, subtitles, dialog body) */
    textMuted: useColorModeValue("gray.600", "gray.300"),
    /** Secondary muted text (meta info, placeholders, empty states) */
    textSecondary: useColorModeValue("gray.500", "gray.400"),
    /** Error text */
    textError: useColorModeValue("red.600", "red.400"),
    /** Accent text (links, highlighted labels) */
    textAccent: useColorModeValue("blue.600", "blue.400"),

    // --- Backgrounds ---
    /** App-level / page background */
    bgApp: useColorModeValue("gray.50", "gray.900"),
    /** Surface background (header, sidebar, dialog body, cards) */
    bgSurface: useColorModeValue("white", "gray.900"),
    /** Elevated card background (goal cards, settings cards) */
    bgCard: useColorModeValue("gray.50", "gray.800"),
    /** Active menu item / hover highlight */
    bgActiveMenu: useColorModeValue("gray.100", "gray.700"),

    // --- Borders ---
    /** Default border color (dividers, card outlines) */
    border: useColorModeValue("gray.200", "gray.700"),
  } as const;
}
