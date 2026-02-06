
import React from 'react';

/**
 * A generic dropdown selector component.
 * 
 * @param {Object} props
 * @param {Array<{value: string|number, label: string}>} props.options - List of options to display
 * @param {string|number} props.value - Current selected value
 * @param {function} props.onChange - Callback when value changes
 * @param {string} [props.className] - Optional CSS class
 * @param {string} [props.id] - Optional ID for the select element
 * @param {string} [props.label] - Optional accessible label text (visually hidden)
 */
function Selector({ options, value, onChange, className = "", id, label = "Select option" }) {
    return (
        <div className={`season-selector ${className}`}>
            <label htmlFor={id} className="sr-only">{label}</label>
            <select
                id={id}
                value={value}
                onChange={(e) => {
                    onChange(e.target.value);
                }}
                className="player-input season-select"
                aria-label={label}
                style={{ width: 'auto', minWidth: '120px' }}
            >
                {options.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
        </div>
    );
}

export default Selector;
