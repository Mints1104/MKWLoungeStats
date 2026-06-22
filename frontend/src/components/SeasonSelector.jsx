import React from 'react';
import Selector from './Selector';

function SeasonSelector({ selectedSeason, onSeasonChange, className = "", id = "season-select" }) {
    const seasons = [
        { value: 3, label: "Season 3" },
        { value: 2, label: "Season 2" },
        { value: 1, label: "Season 1" },
        { value: 0, label: "Preseason" },
    ];

    return (
        <Selector
            options={seasons}
            value={selectedSeason}
            onChange={(val) => onSeasonChange(Number(val))}
            className={className}
            id={id}
            label="Select Season"
        />
    );
}

export default SeasonSelector;
