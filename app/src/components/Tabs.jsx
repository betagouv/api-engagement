import { useRef } from "react";
import { Link, useNavigate } from "react-router-dom";

const TAB_VARIANTS = {
  navbar: {
    base: "hover:bg-gray-975 flex h-full items-center px-6 text-sm",
    active: "border-b-blue-france text-blue-france border-b-2",
    inactive: "border-none text-black",
  },
  primary: {
    base: "border-x-grey-border flex translate-y-px items-center border-x px-4 py-2",
    active: "border-blue-france text-blue-france hover:bg-gray-975 border-t-2 bg-white",
    inactive: "bg-blue-france-925 hover:bg-blue-france-925-hover border-0",
  },
  underline: {
    base: "pb-1",
    active: "border-blue-france text-blue-france border-b-2 font-semibold",
    inactive: "",
  },
};

export const Tab = ({ tab, index, panelId, isFocusable, onKeyDown, setRef, variant = "primary", className = "" }) => {
  const variantClasses = TAB_VARIANTS[variant] || TAB_VARIANTS.primary;
  const tabClassName = `${variantClasses.base} ${tab.isActive ? variantClasses.active : variantClasses.inactive} ${className}`.trim();
  const sharedProps = {
    id: tab.id,
    role: "tab",
    "aria-selected": tab.isActive,
    "aria-controls": panelId,
    tabIndex: isFocusable ? 0 : -1,
    ref: setRef,
    onKeyDown,
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
};

const Tabs = ({ tabs, ariaLabel, panelId, className = "", variant = "primary", tabClassName = "" }) => {
  const navigate = useNavigate();
  const tabRefs = useRef([]);
  const activeTabIndex = tabs.findIndex((tab) => tab.isActive);
  const focusableTabIndex = activeTabIndex === -1 ? 0 : activeTabIndex;

  if (!tabs?.length) return null;

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
      {tabs.map((tab, index) => (
        <Tab
          key={tab.key}
          tab={tab}
          index={index}
          panelId={panelId}
          isFocusable={index === focusableTabIndex}
          setRef={(node) => {
            tabRefs.current[index] = node;
          }}
          onKeyDown={(event) => handleTabKeyDown(event, index, tab)}
          variant={variant}
          className={tabClassName}
        />
      ))}
    </div>
  );
};

export default Tabs;
