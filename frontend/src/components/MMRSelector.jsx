import React from 'react';
import Selector from './Selector';

function MMRSelector({ selectedMMR, onMMRChange, className = "", id = "mmr-select" }) {
    const seasons = [
          { value: 24, label: "24p" },
        { value: 12, label: "12p" },
      
    ];

    return (
        <Selector
            options={seasons}
            value={selectedMMR}
            onChange={(val) => onMMRChange(Number(val))}
            className={className}
            id={id}
            label="Select MMR type"
        />
    );
}

export default MMRSelector;
