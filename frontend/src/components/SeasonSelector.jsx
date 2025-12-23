/**
 * Season selector component
 * Displays available seasons with "Pre Season" for season 0 and "Season N" for others
 * Can be used standalone or inside a filter-group
 */
function SeasonSelector({ value, onChange, className = "", standalone = false }) {
  // Hardcoded seasons: 0 (Pre Season) and 1 (Season 1)
  const seasons = [
    { value: 0, label: "Pre Season" },
    { value: 1, label: "Season 1" },
  ];

  // When used standalone (not in filter-group), wrap in its own container
  if (standalone) {
    return (
      <div className={`season-selector season-selector-standalone ${className}`}>
        <label htmlFor="season-select">Season</label>
        <select
          id="season-select"
          className="player-input"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-label="Select season"
        >
          {seasons.map((season) => (
            <option key={season.value} value={season.value}>
              {season.label}
            </option>
          ))}
        </select>
      </div>
    );
  }

  // When used inside filter-group, just render label and select (filter-group provides structure)
  return (
    <>
      <label htmlFor="season-select">Season</label>
      <select
        id="season-select"
        className="player-input"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label="Select season"
      >
        {seasons.map((season) => (
          <option key={season.value} value={season.value}>
            {season.label}
          </option>
        ))}
      </select>
    </>
  );
}

export default SeasonSelector;

