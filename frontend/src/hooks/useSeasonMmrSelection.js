import { useCallback, useState } from "react";

function resolveInitialValue(value) {
  return typeof value === "function" ? value() : value;
}

export function parseSeasonValue(value, fallback = 2) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

export function parseNullableMmrType(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function useSeasonMmrSelection({
  initialSeason = 2,
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