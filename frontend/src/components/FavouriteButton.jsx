import { useFavourites } from "../hooks/useFavourites";

/** Star toggle that adds or removes a player from the favourites list. */
function FavouriteButton({ name, className = "" }) {
  const { isFavourite, toggleFavourite } = useFavourites();
  const active = isFavourite(name);

  return (
    <button
      type="button"
      className={`favourite-button${active ? " favourite-button-active" : ""} ${className}`.trim()}
      onClick={() => toggleFavourite(name)}
      aria-pressed={active}
      aria-label={
        active ? `Remove ${name} from favourites` : `Add ${name} to favourites`
      }
      title={active ? "Remove from favourites" : "Add to favourites"}
    >
      <span aria-hidden="true">{active ? "★" : "☆"}</span>
    </button>
  );
}

export default FavouriteButton;
