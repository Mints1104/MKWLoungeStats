import { useId, useState } from "react";
import Flag from "./CountryFlag";
import { usePlayerSuggestions } from "../hooks/usePlayerSuggestions";

/**
 * Player-name text input with autocomplete from the leaderboard search
 * (ARIA combobox: arrow keys move, Enter picks, Escape closes).
 * Enter with no suggestion highlighted is left to the surrounding form.
 */
function PlayerNameInput({
  id,
  value,
  onChange,
  onSelect,
  season,
  mmrType,
  placeholder = "Enter a player name",
  ariaLabel = "Player name",
  className = "player-input",
}) {
  const generatedId = useId();
  const listId = `${id || generatedId}-suggestions`;
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const { suggestions } = usePlayerSuggestions(open ? value : "", season, mmrType);

  const showList = open && suggestions.length > 0;
  const active = showList && activeIndex < suggestions.length ? activeIndex : -1;

  const choose = (name) => {
    onChange(name);
    onSelect?.(name);
    setOpen(false);
    setActiveIndex(-1);
  };

  const handleKeyDown = (e) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      if (!suggestions.length) return;
      e.preventDefault();
      setOpen(true);
      const step = e.key === "ArrowDown" ? 1 : -1;
      setActiveIndex(
        (current) =>
          (current + step + suggestions.length) % suggestions.length,
      );
    } else if (e.key === "Enter" && active >= 0) {
      e.preventDefault();
      choose(suggestions[active].name);
    } else if (e.key === "Escape" && showList) {
      e.preventDefault();
      setOpen(false);
      setActiveIndex(-1);
    }
  };

  return (
    <div className="name-combobox">
      <input
        id={id}
        className={className}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setActiveIndex(-1);
        }}
        onKeyDown={handleKeyDown}
        onBlur={() => setOpen(false)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={showList}
        aria-controls={listId}
        aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
        autoComplete="off"
        spellCheck={false}
      />
      {showList && (
        <ul id={listId} role="listbox" className="name-suggestions">
          {suggestions.map((suggestion, index) => (
            <li
              key={suggestion.name}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={index === active}
              className={`name-suggestion${index === active ? " name-suggestion-active" : ""}`}
              // mousedown, so the pick lands before the input's blur closes the list
              onMouseDown={(e) => {
                e.preventDefault();
                choose(suggestion.name);
              }}
            >
              <Flag
                code={suggestion.countryCode}
                className="flag-icon-small"
                aria-hidden="true"
              />
              <span className="name-suggestion-name">{suggestion.name}</span>
              <span className="name-suggestion-mmr">{suggestion.mmr}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default PlayerNameInput;
