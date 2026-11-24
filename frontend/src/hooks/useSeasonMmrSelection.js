import { useCallback, useState } from "react";
import { CURRENT_SEASON } from "../config/seasons";

function resolveInitialValue(value) {
  return typeof value === "function" ? value() : value;
}

// A missing or hand-edited URL value (Number(null) is 0, the preseason) falls back
// instead of reaching the API as a season or ladder that doesn't exist
export function parseSeasonValue(value, fallback = CURRENT_SEASON) {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 && parsed <= CURRENT_SEASON ?
      parsed
    : fallback;
}

export function parseNullableMmrType(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);
  return parsed === 12 || parsed === 24 ? parsed : null;
}

export function useSeasonMmrSelection({
  initialSeason = CURRENT_SEASON,
  initialMmrType = null,
  defaultMmrType = 24,
} = {}) {
  const [season, setSeasonState] = useState(() =>
    parseSeasonValue(resolveInitialValue(initialSeason)),
  );
  const [selectedMmrType, setSelectedMmrTypeState] = useState(() =>
    parseNullableMmrType(resolveInitialValue(initialMmrType)),
  );

  const setSeason = useCallback((nextSeason) => {
    setSeasonState(parseSeasonValue(nextSeason));
  }, []);

  const setSelectedMmrType = useCallback((nextMmrType) => {
    setSelectedMmrTypeState(parseNullableMmrType(nextMmrType));
  }, []);

  return {
    season,
    setSeason,
    selectedMmrType,
    setSelectedMmrType,
    mmrType: selectedMmrType ?? defaultMmrType,
  };
}

export default useSeasonMmrSelection;
