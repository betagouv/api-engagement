import { useId } from "react";
import { Tooltip as ReactTooltip } from "react-tooltip";

const DEFAULT_OPEN_EVENTS = {
  mouseover: true,
  focus: true,
  click: true,
};

const DEFAULT_CLOSE_EVENTS = {
  mouseout: true,
  blur: true,
  click: true,
};

const normalizeId = (value) => String(value).replace(/:/g, "");

const Tooltip = ({
  id,
  content,
  children,
  ariaLabel = "Afficher une infobulle",
  triggerClassName = "",
  tooltipClassName = "",
  openEvents = DEFAULT_OPEN_EVENTS,
  closeEvents = DEFAULT_CLOSE_EVENTS,
  ...tooltipProps
}) => {
  const fallbackId = normalizeId(useId());
  const tooltipId = id ? normalizeId(id) : fallbackId;
  const composedTriggerClassName = `focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${triggerClassName}`.trim();

  return (
    <>
      <button
        type="button"
        className={composedTriggerClassName}
        data-tooltip-id={tooltipId}
        aria-describedby={tooltipId}
        aria-label={ariaLabel}
      >
        {children}
      </button>
      <ReactTooltip
        id={tooltipId}
        role="tooltip"
        openEvents={openEvents}
        closeEvents={closeEvents}
        closeOnEsc
        className={tooltipClassName}
        {...tooltipProps}
      >
        {content}
      </ReactTooltip>
    </>
  );
};

export default Tooltip;
