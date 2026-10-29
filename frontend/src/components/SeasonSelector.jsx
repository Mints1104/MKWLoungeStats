import React from 'react';
import Selector from './Selector';
import { SEASON_OPTIONS } from '../config/seasons';

function SeasonSelector({ selectedSeason, onSeasonChange, className = "", id = "season-select" }) {
    return (
        <Selector
            options={SEASON_OPTIONS}
            value={selectedSeason}
            onChange={(val) => onSeasonChange(Number(val))}
            className={className}
            id={id}
            label="Select Season"
        />
    );
}

export default SeasonSelector;
