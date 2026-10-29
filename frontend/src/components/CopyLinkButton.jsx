import { useEffect, useState } from "react";
import logger from "../utils/logger";

const COPIED_MESSAGE_MS = 2000;

/** Copies the current page's URL (or `url`) to the clipboard. */
function CopyLinkButton({ url, label = "Copy link", className = "" }) {
  const [status, setStatus] = useState("idle");

  useEffect(() => {
    if (status === "idle") return undefined;
    const timer = setTimeout(() => setStatus("idle"), COPIED_MESSAGE_MS);
    return () => clearTimeout(timer);
  }, [status]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url ?? window.location.href);
      setStatus("copied");
    } catch (err) {
      logger.warn("Failed to copy link", err);
      setStatus("failed");
    }
  };

  return (
    <button
      type="button"
      className={`secondary-button ${className}`.trim()}
      onClick={copy}
    >
      {status === "copied" ?
        "Link copied"
      : status === "failed" ?
        "Couldn't copy"
      : label}
      <span className="sr-only" aria-live="polite">
        {status === "copied" ?
          "Link copied to clipboard"
        : status === "failed" ?
          "Couldn't copy the link"
        : ""}
      </span>
    </button>
  );
}

export default CopyLinkButton;
