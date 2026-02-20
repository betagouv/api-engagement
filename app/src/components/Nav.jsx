import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { useEffect, useRef, useState } from "react";
import { RiArrowDownSFill, RiArrowDownSLine, RiArrowLeftRightLine, RiCheckLine, RiSearchLine } from "react-icons/ri";
import { Link, useLocation, useNavigate } from "react-router-dom";

import api from "../services/api";
import { captureError } from "../services/error";
import useStore from "../services/store";
import { withLegacyPublishers } from "../utils/publisher";

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
        if (!res.ok) throw res;
        const normalized = withLegacyPublishers(res.data);
        setPublishers(normalized.sort((a, b) => (a.name || "").localeCompare(b.name || "")));
      } catch (error) {
        captureError(error, { extra: { userRole: user.role, userPublishers: user.publishers } });
      }
    };

    let newFlux = localStorage.getItem("flux") || flux;
    if (newFlux === "to" && !publisher.isAnnonceur) newFlux = "from";
    if (newFlux === "from" && !(publisher.hasApiRights || publisher.hasWidgetRights || publisher.hasCampaignRights)) newFlux = "to";
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
    <nav role="navigation" aria-label="Navigation principale" className="flex w-full justify-center bg-white shadow-lg">
      <div className="flex w-full max-w-312 flex-wrap items-center justify-between pl-4">
        <ul className="m-0 flex w-full list-none flex-wrap items-center justify-between gap-x-6 gap-y-2 p-0" role="list" aria-label="Menu principal">
          <li className="flex items-center gap-4 lg:gap-6">
            {publisher.isAnnonceur && (publisher.hasApiRights || publisher.hasWidgetRights || publisher.hasCampaignRights) && <FluxMenu value={flux} onChange={handleFluxChange} />}
            <ul className="m-0 flex list-none flex-wrap items-center gap-4 p-0 lg:gap-6">
              {menuItems.map((item) => (
                <li key={item.key}>
                  <Link
                    to={item.to}
                    aria-current={item.isActive ? "page" : undefined}
                    className={`hover:bg-gray-975 flex items-center px-4 py-3 text-sm lg:px-6 ${
                      item.isActive ? "border-b-blue-france text-blue-france border-b-2" : "border-none text-black"
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </li>

          <li className="flex items-center gap-4 lg:gap-6">
            {publishers.length > 1 && <PublisherMenu options={publishers} value={publisher} onChange={handleChangePublisher} />}
            {user.role === "admin" && <AdminMenu />}
          </li>
        </ul>
      </div>
    </nav>
  );
};

const FluxMenu = ({ value, onChange }) => (
  <Menu>
    <MenuButton className="bg-blue-france focus-visible:outline-outline-blue flex w-44 cursor-pointer items-center justify-between rounded-full px-4 py-2 text-sm text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">
      <span>Mode {value === "to" ? "annonceur" : "diffuseur"}</span>

      <RiArrowDownSFill className="text-base" />
    </MenuButton>

    <MenuItems
      transition
      anchor="bottom start"
      className="border-grey-border divide-grey-border mt-2 w-64 origin-top-left divide-y border bg-white shadow-lg transition duration-200 ease-out focus:outline-none data-closed:scale-95 data-closed:opacity-0"
    >
      <MenuItem>
        <button
          aria-current="page"
          className="data-[focus]:ring-outline-blue data-[focus]:bg-gray-975 flex w-full cursor-pointer items-center justify-between p-4 text-left text-sm data-[focus]:ring-2 data-[focus]:ring-inset"
          onClick={() => onChange(value === "to" ? "to" : "from")}
        >
          <span>Mode {value === "to" ? "annonceur" : "diffuseur"}</span>
          <div>
            <RiCheckLine className="text-success text-lg" />
            <span className="sr-only">État du service</span>
          </div>
        </button>
      </MenuItem>
      <MenuItem>
        <button
          className="data-[focus]:ring-outline-blue data-[focus]:bg-gray-975 flex w-full cursor-pointer items-center justify-between p-4 text-left text-sm data-[focus]:ring-2 data-[focus]:ring-inset"
          onClick={() => onChange(value === "to" ? "from" : "to")}
        >
          <span>Mode {value === "to" ? "diffuseur" : "annonceur"}</span>
          <div>
            <RiArrowLeftRightLine className="text-blue-france text-lg" />
            <span className="sr-only">État du service</span>
          </div>
        </button>
      </MenuItem>
    </MenuItems>
  </Menu>
);

const PublisherMenu = ({ options, value, onChange }) => {
  const ref = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setIsOpen(false);
    };

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [ref]);

  return (
    <div className="relative h-full" ref={ref}>
      <button
        className="hover:bg-gray-975 focus-visible:ring-outline-blue flex h-full cursor-pointer items-center justify-between gap-4 px-4 text-sm focus:outline-none focus-visible:ring-2"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="font-semibold">{value.name}</span>
        <RiArrowDownSLine className={`text-lg ${isOpen ? "rotate-180 transform" : ""}`} />
      </button>

      <div className={`absolute z-10 mt-1 origin-top-right transition duration-200 ease-in-out ${isOpen ? "" : "pointer-events-none scale-95 opacity-0"}`}>
        {isOpen && (
          <div className={`border-grey-border w-72 border bg-white shadow-lg focus:outline-none`}>
            <div role="search" className="border-grey-border focus-visible:ring-outline-blue flex items-center gap-2 border-b p-3 focus-visible:ring-2">
              <RiSearchLine />
              <label htmlFor="publisher-search" className="sr-only">
                Rechercher un partenaire
              </label>
              <input id="publisher-search" name="publisher-search" className="w-full pl-2 focus:outline-none" onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="max-h-80 overflow-y-scroll">
              {options
                .filter((option) => option.name.toLowerCase().includes(search.toLowerCase()))
                .map((option, index) => (
                  <button
                    key={index}
                    className="hover:bg-gray-975 focus-visible:bg-gray-975 border-grey-border focus-visible:ring-outline-blue flex w-full items-center justify-between border-b p-4 text-left text-sm focus:outline-none focus-visible:ring-1"
                    onClick={() => {
                      setSearch("");
                      setIsOpen(false);
                      onChange(option);
                    }}
                  >
                    <span>{option.name}</span>
                    {(value.id ?? value._id) === (option.id ?? option._id) && <RiCheckLine className="text-blue-france text-lg" />}
                  </button>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const AdminMenu = () => (
  <Menu>
    {({ open }) => (
      <>
        <MenuButton className="data-[focus]:bg-gray-975 hover:bg-gray-975 flex h-full cursor-pointer items-center justify-between gap-4 px-4 text-sm">
          <span className="font-semibold">Administration</span>
          <RiArrowDownSLine className={`text-lg ${open ? "rotate-180 transform" : ""}`} />
        </MenuButton>
        <MenuItems
          transition
          anchor="bottom end"
          className="border-grey-border divide-grey-border mt-1 w-64 origin-top-right divide-y border bg-white shadow-lg transition duration-200 ease-out focus:outline-none data-closed:scale-95 data-closed:opacity-0"
        >
          <MenuItem>
            <Link to="/admin-account" className="data-[focus]:bg-gray-975 block w-full p-4 text-sm">
              Comptes
            </Link>
          </MenuItem>
          <MenuItem>
            <Link to="/admin-mission" className="data-[focus]:bg-gray-975 block w-full p-4 text-sm">
              Missions
            </Link>
          </MenuItem>
          <MenuItem>
            <Link to="/admin-organization" className="data-[focus]:bg-gray-975 block w-full p-4 text-sm">
              Organisations
            </Link>
          </MenuItem>
          <MenuItem>
            <Link to="/admin-stats" className="data-[focus]:bg-gray-975 block w-full p-4 text-sm">
              Statistiques
            </Link>
          </MenuItem>
          <MenuItem>
            <Link to="/admin-warning" className="data-[focus]:bg-gray-975 block w-full p-4 text-sm">
              Alertes
            </Link>
          </MenuItem>
          <MenuItem>
            <Link to="/admin-report" className="data-[focus]:bg-gray-975 block w-full p-4 text-sm">
              Rapports d'impacts
            </Link>
          </MenuItem>
        </MenuItems>
      </>
    )}
  </Menu>
);

export default Nav;
