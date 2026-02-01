import React from 'react';

function MMRSelector({ selectedMMR, onMMRChange, className = "", id = "mmr-select" }) {
    const seasons = [
          { value: 24, label: "24p" },
        { value: 12, label: "12p" },
      
    ];

    return (
        <div className={`season-selector ${className}`}>
            <label htmlFor={id} className="sr-only">Select MMR type</label>
            <select
                id={id}
                value={selectedMMR}
                onChange={(e) => onMMRChange(Number(e.target.value))}
                className="player-input season-select"
                aria-label="Select MMR type"
                style={{ width: 'auto', minWidth: '120px' }}
            >
                {seasons.map((mmr) => (
                    <option key={mmr.value} value={mmr.value}>
                        {mmr.label}
                    </option>
                ))}
            </select>
        </div>
    );
}

export default MMRSelector;
