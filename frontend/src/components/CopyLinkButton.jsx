import { useEffect, useState } from "react";
import { TbCheck, TbLink } from "react-icons/tb";
import logger from "../utils/logger";

const COPIED_MESSAGE_MS = 2000;

/**
 * Copies the current page's URL (or `url`) to the clipboard.
 * `variant="icon"` renders a round link-icon button (label as its accessible name
 * and tooltip) that turns into a tick once copied.
 */
function CopyLinkButton({
  url,
  label = "Copy link",
  variant = "text",
  className = "",
}) {
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

  // Outside the button: an icon button's aria-label would otherwise mask it
  const announcement = (
    <span className="sr-only" aria-live="polite">
      {status === "copied" ?
        "Link copied to clipboard"
      : status === "failed" ?
        "Couldn't copy the link"
      : ""}
    </span>
  );

  if (variant === "icon") {
    return (
      <>
        <button
          type="button"
          className={`icon-button${status === "copied" ? " icon-button-success" : ""} ${className}`.trim()}
          onClick={copy}
          aria-label={label}
          title={
            status === "copied" ? "Link copied"
            : status === "failed" ?
              "Couldn't copy"
            : label
          }
        >
          {status === "copied" ?
            <TbCheck aria-hidden="true" />
          : <TbLink aria-hidden="true" />}
        </button>
        {announcement}
      </>
    );
  }

  return (
    <>
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
      </button>
      {announcement}
    </>
  );
}

export default CopyLinkButton;
