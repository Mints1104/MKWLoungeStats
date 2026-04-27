import { createContext, useContext } from "react";

export const DEFAULT_GAME_MODE = 24;
export const SETTINGS_STORAGE_KEY = "mkworld.defaultGameMode";
const VALID_GAME_MODES = new Set([12, 24]);

export const SettingsContext = createContext(null);

export function sanitizeGameMode(value) {
  const parsed = Number(value);
  return VALID_GAME_MODES.has(parsed) ? parsed : DEFAULT_GAME_MODE;
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
}
