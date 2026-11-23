const MEDALS = ["🥇", "🥈", "🥉"];

/** Medal for the top three places, "4th", "5th", ... after that (index is 0-based). */
export function getPlaceLabel(index) {
  if (index < MEDALS.length) return MEDALS[index];
  const place = index + 1;
  const lastTwo = place % 100;
  const suffix =
    lastTwo >= 11 && lastTwo <= 13 ? "th"
    : place % 10 === 1 ? "st"
    : place % 10 === 2 ? "nd"
    : place % 10 === 3 ? "rd"
    : "th";
  return `${place}${suffix}`;
}

/** "Squad Queue" for the SQ tier, otherwise "Tier X". */
export function getTierLabel(tier) {
  return tier === "SQ" ? "Squad Queue" : `Tier ${tier}`;
}

/**
 * The format block to show: the requested one if the ladder has it, else FFA,
 * else whatever comes first.
 * @param {{ formats?: Array<{ format: string }> }|null} records
 * @param {string} format
 */
export function pickFormat(records, format) {
  const formats = records?.formats ?? [];
  return (
    formats.find((f) => f.format === format) ??
    formats.find((f) => f.format === "FFA") ??
    formats[0] ??
    null
  );
}
