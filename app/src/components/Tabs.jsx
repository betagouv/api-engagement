import { useRef } from "react";
import { Link, useNavigate } from "react-router-dom";

const Tabs = ({ tabs, ariaLabel, panelId, className = "", getTabClassName }) => {
  const navigate = useNavigate();
  const tabRefs = useRef([]);
  const activeTabIndex = tabs.findIndex((tab) => tab.isActive);
  const focusableTabIndex = activeTabIndex === -1 ? 0 : activeTabIndex;

  const focusTab = (index) => {
    const tab = tabRefs.current[index];
    if (tab) tab.focus();
  };

  const activateTab = (tab) => {
    if (tab.onSelect) tab.onSelect();
    if (tab.to) navigate(tab.to);
  };

  const handleTabKeyDown = (event, index, tab) => {
    switch (event.key) {
      case "ArrowRight": {
        event.preventDefault();
        focusTab((index + 1) % tabs.length);
        break;
      }
      case "ArrowLeft": {
        event.preventDefault();
        focusTab((index - 1 + tabs.length) % tabs.length);
        break;
      }
      case "Home": {
        event.preventDefault();
        focusTab(0);
        break;
      }
      case "End": {
        event.preventDefault();
        focusTab(tabs.length - 1);
        break;
      }
      case "Enter":
      case " ":
      case "Spacebar": {
        event.preventDefault();
        activateTab(tab);
        break;
      }
      default:
        break;
    }
  };

  return (
    <div role="tablist" aria-label={ariaLabel} className={className}>
      {tabs.map((tab, index) => {
        const tabClassName = getTabClassName ? getTabClassName(tab) : tab.className;
        const sharedProps = {
          id: tab.id,
          role: "tab",
          "aria-selected": tab.isActive,
          "aria-controls": panelId,
          tabIndex: index === focusableTabIndex ? 0 : -1,
          ref: (node) => {
            tabRefs.current[index] = node;
          },
          onKeyDown: (event) => handleTabKeyDown(event, index, tab),
          className: tabClassName,
        };

        if (tab.to) {
          return (
            <Link key={tab.key} to={tab.to} {...sharedProps}>
              {tab.label}
            </Link>
          );
        }

        return (
          <button key={tab.key} type="button" onClick={tab.onSelect} {...sharedProps}>
            {tab.label}
          </button>
        );
      })}
    </div>
  );
};

export default Tabs;
