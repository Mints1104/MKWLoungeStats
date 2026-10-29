import { getFlagUrl } from "../utils/flagUrls";

/** Drop-in replacement for react-world-flags' <Flag> that loads one SVG on demand. */
function CountryFlag({ code, fallback = null, ...rest }) {
  const src = getFlagUrl(code);
  if (!src) return fallback;

  return (
    <img
      src={src}
      alt={rest["aria-label"] ?? ""}
      loading="lazy"
      decoding="async"
      {...rest}
    />
  );
}

export default CountryFlag;
