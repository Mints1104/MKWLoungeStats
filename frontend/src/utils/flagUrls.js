// Flag SVGs ship with react-world-flags, but importing its component bundles every
// flag (~3.7 MB) into the JS. Globbing the files with `?no-inline` keeps only a map of
// URLs in the bundle; each flag is its own static asset, fetched when first shown.
const FLAG_URLS = Object.fromEntries(
  Object.entries(
    import.meta.glob("/node_modules/react-world-flags/src/svgs/*.svg", {
      query: "?no-inline",
      import: "default",
      eager: true,
    }),
  ).map(([path, url]) => [path.split("/").pop().replace(".svg", ""), url]),
);

/** Returns the flag image URL for an alpha-2 code (e.g. "US", "gb-eng"), or null. */
export function getFlagUrl(code) {
  if (typeof code !== "string") return null;
  return FLAG_URLS[code.trim().toLowerCase()] ?? null;
}
