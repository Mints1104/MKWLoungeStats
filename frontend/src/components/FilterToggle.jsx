import { memo } from "react";

const FilterToggle = memo(function FilterToggle({ activeFilter, onFilterChange, options }) {
    return (
        <div className="filter-toggle">
            {options.map((option) => (
                <button
                    key={option.value}
                    type="button"
                    className={`filter-button ${
                        activeFilter === option.value ? "filter-button-active" : ""
                    }`}
                    onClick={() => onFilterChange(option.value)}
                >
                    {option.label}
                </button>
            ))}
        </div>
    );
});

export default FilterToggle;
