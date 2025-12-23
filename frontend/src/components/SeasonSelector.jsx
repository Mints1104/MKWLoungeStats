import React from 'react';

function SeasonSelector({ selectedSeason, onSeasonChange, className = "", id = "season-select" }) {
    // Currently only supporting Season 1 and Season 0 (Preseason)
    const seasons = [
        { value: 1, label: "Season 1" },
        { value: 0, label: "Preseason" }
    ];

    return (
        <div className={`season-selector ${className}`}>
            <label htmlFor={id} className="sr-only">Select Season</label>
            <select
                id={id}
                value={selectedSeason}
                onChange={(e) => onSeasonChange(Number(e.target.value))}
                className="player-input season-select"
                aria-label="Select Season"
                style={{ width: 'auto', minWidth: '120px' }}
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

export default SeasonSelector;
