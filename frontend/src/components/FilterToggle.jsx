import { memo } from "react";

const FilterToggle = memo(function FilterToggle({
    activeFilter,
    onFilterChange,
    options,
    ariaLabel,
    ariaLabelledBy,
}) {
    return (
        <div
            className="filter-toggle"
            role="group"
            aria-label={ariaLabel}
            aria-labelledby={ariaLabelledBy}
        >
            {options.map((option) => (
                <button
                    key={option.value}
                    type="button"
                    className={`filter-button ${
                        activeFilter === option.value ? "filter-button-active" : ""
                    }`}
                    onClick={() => onFilterChange(option.value)}
                    aria-pressed={activeFilter === option.value}
                >
                    {option.label}
                </button>
            ))}
        </div>
    );
});

export default FilterToggle;
