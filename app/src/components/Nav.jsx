import { useEffect, useRef, useState } from "react";
import { RiArrowDownSFill, RiArrowDownSLine, RiArrowLeftRightLine, RiCheckLine, RiSearchLine } from "react-icons/ri";
import { Link, useLocation, useNavigate } from "react-router-dom";

import api from "@/services/api";
import { captureError } from "@/services/error";
import useStore from "@/services/store";
import { withLegacyPublishers } from "@/utils/publisher";

const Nav = () => {
  const { user, publisher, flux, setPublisher, setFlux } = useStore();
  const [publishers, setPublishers] = useState([]);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const query = user.role === "admin" ? {} : { ids: user.publishers };
        const res = await api.post("/publisher/search", query);
        if (!res.ok) {
          throw res;
        }
        const normalized = withLegacyPublishers(res.data);
        setPublishers(normalized.sort((a, b) => (a.name || "").localeCompare(b.name || "")));
      } catch (error) {
        captureError(error, { extra: { userRole: user.role, userPublishers: user.publishers } });
      }
    };

    let newFlux = localStorage.getItem("flux") || flux;
    if (newFlux === "to" && !publisher.isAnnonceur) {
      newFlux = "from";
    }
    if (newFlux === "from" && !(publisher.hasApiRights || publisher.hasWidgetRights || publisher.hasCampaignRights)) {
      newFlux = "to";
    }
    setFlux(newFlux);

    fetchData();
  }, []);

  const publisherId = publisher?.id;

  const handleFluxChange = (flux) => {
    setFlux(flux);
    navigate(`/${publisherId}/performance`);
  };

  const handleChangePublisher = (newPublisher) => {
    const id = newPublisher.id || newPublisher._id;
    setPublisher(newPublisher);
    navigate(`/${id}/performance`);
  };

  const menuItems = [
    {
      key: "performance",
      label: "Performance",
      to: `/${publisherId}/performance`,
      isActive: location.pathname.includes("performance"),
    },
    ...(flux === "from"
      ? [
          {
            key: "broadcast",
            label: "Diffuser des missions",
            to: `/${publisherId}/broadcast`,
            isActive: location.pathname.includes("broadcast"),
          },
          ...(publisher.hasApiRights || publisher.hasCampaignRights || publisher.hasWidgetRights
            ? [
                {
                  key: "settings",
                  label: "Paramètres",
                  to: `/${publisherId}/settings`,
                  isActive: location.pathname.includes("settings"),
                },
              ]
            : []),
        ]
      : [
          {
            key: "my-missions",
            label: "Vos missions",
            to: `/${publisherId}/my-missions`,
            isActive: location.pathname.includes("my-missions"),
          },
          {
            key: "settings",
            label: "Paramètres",
            to: `/${publisherId}/settings`,
            isActive: location.pathname.includes("settings"),
          },
        ]),
  ];

  return (
    <div className="w-full bg-white shadow-lg">
      <nav role="navigation" aria-label="Navigation principale" className="mx-auto min-h-14 w-full max-w-312">
        <ul className="m-0 flex w-full list-none flex-col items-center justify-between gap-x-6 gap-y-2 p-0 lg:flex-row" role="list" aria-label="Menu principal">
          <li className="flex flex-col items-center gap-4 lg:flex-row lg:gap-6">
            {publisher.isAnnonceur && (publisher.hasApiRights || publisher.hasWidgetRights || publisher.hasCampaignRights) && <FluxMenu value={flux} onChange={handleFluxChange} />}
            <ul className="m-0 flex list-none flex-col items-center gap-4 p-0 lg:flex-row lg:gap-6">
              {menuItems.map((item) => (
                <li key={item.key}>
                  <Link to={item.to} aria-current={item.isActive} className="nav-item">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </li>

          <li className="flex flex-col items-center gap-4 lg:flex-row lg:gap-6">
            {publishers.length > 1 && <PublisherMenu options={publishers} value={publisher} onChange={handleChangePublisher} />}
            {user.role === "admin" && <AdminMenu />}
          </li>
        </ul>
      </nav>
    </div>
  );
};

const FLUX_OPTIONS = [
  { key: "current", getFlux: (v) => v, getLabel: (v) => `Mode ${v === "to" ? "annonceur" : "diffuseur"}`, isCurrent: true },
  { key: "other", getFlux: (v) => (v === "to" ? "from" : "to"), getLabel: (v) => `Mode ${v === "to" ? "diffuseur" : "annonceur"}`, isCurrent: false },
];

const FluxMenu = ({ value, onChange }) => {
  const ref = useRef(null);
  const buttonRef = useRef(null);
  const [listRef, setListRef] = useState(FLUX_OPTIONS.map(() => undefined));
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  const handleFocusOut = (e) => {
    if (ref.current && !ref.current.contains(e.relatedTarget)) {
      setIsOpen(false);
    }
  };

  const handleButtonKeyDown = (e) => {
    if (!isOpen && (e.key === "Enter" || e.key === " " || e.key === "ArrowDown")) {
      e.preventDefault();
      setIsOpen(true);
      setFocusedIndex(0);
      requestAnimationFrame(() => listRef[0]?.focus());
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      setIsOpen(false);
    }
  };

  const handleListKeyDown = (e, option, index) => {
    switch (e.key) {
      case "ArrowDown": {
        e.preventDefault();
        const newIndex = index < FLUX_OPTIONS.length - 1 ? index + 1 : 0;
        setFocusedIndex(newIndex);
        listRef[newIndex]?.focus();
        break;
      }
      case "ArrowUp": {
        e.preventDefault();
        const newIndex = index > 0 ? index - 1 : FLUX_OPTIONS.length - 1;
        setFocusedIndex(newIndex);
        listRef[newIndex]?.focus();
        break;
      }
      case "Enter":
      case " ": {
        e.preventDefault();
        onChange(option.getFlux(value));
        setIsOpen(false);
        buttonRef.current?.focus();
        break;
      }
      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        buttonRef.current?.focus();
        break;
      case "Tab":
        setIsOpen(false);
        break;
    }
  };

  return (
    <div className="relative" ref={ref} onBlur={handleFocusOut}>
      <button
        ref={buttonRef}
        className="bg-blue-france hover:bg-blue-france-hover active:bg-blue-france-hover focus flex w-44 cursor-pointer items-center justify-between rounded-full px-4 py-2 text-sm text-white"
        aria-expanded={isOpen}
        aria-haspopup="true"
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleButtonKeyDown}
      >
        <span>Mode {value === "to" ? "annonceur" : "diffuseur"}</span>
        <RiArrowDownSFill className={`text-base transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>

      <div
        inert={!isOpen ? true : undefined}
        className={`border-grey-border absolute left-0 z-10 mt-2 w-64 border bg-white shadow-lg transition-[max-height,opacity] duration-200 ease-in-out ${isOpen ? "max-h-96 opacity-100" : "pointer-events-none max-h-0 opacity-0"}`}
      >
        <ul className="m-0 flex list-none flex-col p-0" role="listbox">
          {FLUX_OPTIONS.map((option, index) => (
            <li
              ref={(el) => {
                listRef[index] = el || undefined;
              }}
              key={option.key}
              role="option"
              aria-selected={value === option.getFlux(value)}
              tabIndex={focusedIndex === index ? 0 : -1}
              className="nav-link items-center justify-between"
              onClick={() => {
                onChange(option.getFlux(value));
                setIsOpen(false);
              }}
              onKeyDown={(e) => handleListKeyDown(e, option, index)}
            >
              <span>{option.getLabel(value)}</span>
              {option.isCurrent ? (
                <RiCheckLine className="text-success text-lg" aria-hidden="true" />
              ) : (
                <RiArrowLeftRightLine className="text-blue-france text-lg" aria-hidden="true" />
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

const PublisherMenu = ({ options, value, onChange }) => {
  const ref = useRef(null);
  const buttonRef = useRef(null);
  const inputRef = useRef(null);
  const [listRef, setListRef] = useState([]);
  const [show, setShow] = useState(false);
  const [search, setSearch] = useState("");
  const [focusedIndex, setFocusedIndex] = useState(-1);

  const filtered = options.filter((option) => option.name.toLowerCase().includes(search.toLowerCase()));

  useEffect(() => {
    setListRef(filtered.map(() => undefined));
    setFocusedIndex(-1);
  }, [filtered.length, search]);

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setShow(false);
      }
    };

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  const handleFocusOut = (e) => {
    if (ref.current && !ref.current.contains(e.relatedTarget)) {
      setShow(false);
    }
  };

  const handleInputKeyDown = (e) => {
    switch (e.key) {
      case "ArrowDown": {
        e.preventDefault();
        if (filtered.length > 0) {
          const newIndex = 0;
          setFocusedIndex(newIndex);
          listRef[newIndex]?.focus();
        }
        break;
      }
      case "ArrowUp": {
        e.preventDefault();
        if (filtered.length > 0) {
          const newIndex = filtered.length - 1;
          setFocusedIndex(newIndex);
          listRef[newIndex]?.focus();
        }
        break;
      }
      case "Tab":
        if (!e.shiftKey && filtered.length > 0) {
          e.preventDefault();
          setFocusedIndex(0);
          listRef[0]?.focus();
        }
        break;
      case "Escape":
        e.preventDefault();
        setShow(false);
        buttonRef.current?.focus();
        break;
    }
  };

  const handleListKeyDown = (e, option, index) => {
    switch (e.key) {
      case "ArrowDown": {
        e.preventDefault();
        const newIndex = index < filtered.length - 1 ? index + 1 : 0;
        setFocusedIndex(newIndex);
        listRef[newIndex]?.focus();
        break;
      }
      case "ArrowUp": {
        e.preventDefault();
        const newIndex = index > 0 ? index - 1 : filtered.length - 1;
        setFocusedIndex(newIndex);
        listRef[newIndex]?.focus();
        break;
      }
      case "Enter":
      case " ": {
        e.preventDefault();
        setSearch("");
        setShow(false);
        onChange(option);
        buttonRef.current?.focus();
        break;
      }
      case "Escape":
        e.preventDefault();
        setShow(false);
        buttonRef.current?.focus();
        break;
      case "Tab":
        if (e.shiftKey) {
          e.preventDefault();
          inputRef.current?.focus();
        } else {
          setShow(false);
        }
        break;
    }
  };

  return (
    <div className="relative h-full" ref={ref} onBlur={handleFocusOut}>
      <button ref={buttonRef} className="nav-item" aria-expanded={show} aria-haspopup="true" type="button" onClick={() => setShow(!show)}>
        <span className="font-semibold">{value.name}</span>
        <RiArrowDownSLine className={`ml-2 text-lg transition-transform duration-200 ${show ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="publisher-search"
        inert={!show ? true : undefined}
        className={`border-grey-border absolute right-0 z-50 w-80 border bg-white shadow-lg transition-[max-height,opacity] duration-200 ease-in-out focus:outline-none ${show ? "max-h-96 opacity-100" : "pointer-events-none max-h-0 opacity-0"}`}
      >
        <div role="search" className="border-grey-border focus mb-1 flex items-center gap-2 border-b p-3">
          <RiSearchLine aria-hidden="true" />
          <label htmlFor="publisher-search" className="sr-only">
            Rechercher un partenaire
          </label>
          <input
            ref={inputRef}
            type="search"
            role="searchbox"
            id="publisher-search"
            name="publisher-search"
            className="w-full pl-2 focus:outline-none"
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleInputKeyDown}
          />
        </div>
        <ul className="flex max-h-80 list-none flex-col overflow-x-visible overflow-y-auto px-2 py-1" role="listbox">
          {filtered.map((option, index) => (
            <li
              ref={(el) => {
                listRef[index] = el || undefined;
              }}
              key={index}
              role="option"
              aria-selected={focusedIndex === index}
              aria-label={option.name}
              tabIndex={focusedIndex === index ? 0 : -1}
              className={`nav-link cursor-pointer items-center ${index === 0 ? "shadow-none" : ""} ${focusedIndex === index || value.id === option.id ? "text-blue-france" : ""}`}
              onClick={() => {
                setSearch("");
                setShow(false);
                setFocusedIndex(-1);
                onChange(option);
              }}
              onKeyDown={(e) => handleListKeyDown(e, option, index)}
            >
              <span>{option.name}</span>
              {value.id === option.id && <RiCheckLine className="text-blue-france ml-2 text-base" aria-hidden="true" />}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

const ADMIN_MENU_ITEMS = [
  {
    key: "accounts",
    label: "Comptes",
    href: "/admin-account",
  },
  {
    key: "missions",
    label: "Missions",
    href: "/admin-mission",
  },
  {
    key: "organizations",
    label: "Organisations",
    href: "/admin-organization",
  },
  {
    key: "stats",
    label: "Statistiques",
    href: "/admin-stats",
  },
  {
    key: "warnings",
    label: "Alertes",
    href: "/admin-warning",
  },
  {
    key: "reports",
    label: "Rapports d'impacts",
    href: "/admin-report",
  },
];

const AdminMenu = () => {
  const ref = useRef(null);
  const buttonRef = useRef(null);
  const [show, setShow] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setShow(false);
      }
    };

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  const handleFocusOut = (e) => {
    if (ref.current && !ref.current.contains(e.relatedTarget)) {
      setShow(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Escape") {
      setShow(false);
      buttonRef.current?.focus();
    }
  };

  return (
    <div className="relative h-full" ref={ref} onBlur={handleFocusOut} onKeyDown={handleKeyDown}>
      <button ref={buttonRef} className="nav-item" aria-expanded={show} aria-haspopup="true" type="button" onClick={() => setShow(!show)}>
        <span className="font-semibold">Administration</span>
        <RiArrowDownSLine className={`ml-2 text-lg transition-transform duration-200 ${show ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>
      <div
        inert={!show ? true : undefined}
        className={`border-grey-border absolute right-0 z-10 w-80 border bg-white shadow-lg transition-[max-height,opacity] duration-200 ease-in-out ${show ? "max-h-96 opacity-100" : "pointer-events-none max-h-0 opacity-0"}`}
      >
        <ul className="m-0 flex list-none flex-col p-0">
          {ADMIN_MENU_ITEMS.map((item, index) => {
            const isCurrent = location.pathname.startsWith(item.href);
            return (
              <li key={index}>
                <Link to={item.href} className="nav-link" aria-current={isCurrent ? "page" : undefined}>
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
};

export default Nav;
