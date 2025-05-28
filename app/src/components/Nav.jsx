import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { useEffect, useRef, useState } from "react";
import { RiArrowDownSFill, RiArrowDownSLine, RiArrowLeftRightLine, RiCheckLine, RiSearchLine } from "react-icons/ri";
import { Link, useLocation, useNavigate } from "react-router-dom";

import api from "../services/api";
import { captureError } from "../services/error";
import useStore from "../services/store";

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
        setPublishers(res.data.sort((a, b) => (a.name || "").localeCompare(b.name)));
      } catch (error) {
        captureError(error, "Erreur lors de la récupération des partenaires");
      }
    };

    let newFlux = localStorage.getItem("flux") || flux;
    if (newFlux === "to" && !publisher.isAnnonceur) newFlux = "from";
    if (newFlux === "from" && !(publisher.hasApiRights || publisher.hasWidgetRights || publisher.hasCampaignRights)) newFlux = "to";
    setFlux(newFlux);

    fetchData();
  }, []);

  const handleFluxChange = (flux) => {
    setFlux(flux);
    navigate("/performance");
  };

  const handleChangePublisher = (publisher) => {
    setPublisher(publisher);
    navigate("/performance");
  };

  return (
    <nav className="flex w-full justify-center bg-white shadow-lg">
      <div className="flex w-full max-w-[78rem] items-center justify-between h-14 pl-4">
        <div className="flex h-full items-center gap-6">
          {publisher.isAnnonceur && (publisher.hasApiRights || publisher.hasWidgetRights || publisher.hasCampaignRights) && <FluxMenu value={flux} onChange={handleFluxChange} />}
          <Link
            to="/performance"
            className={`px-6 h-full flex items-center text-sm hover:bg-gray-hover ${location.pathname.includes("performance") ? "border-b-2 border-b-blue-dark text-blue-dark" : "border-none text-black"}`}
          >
            Performance
          </Link>

          {flux === "from" ? (
            <>
              <Link
                to="/broadcast"
                className={`px-6 h-full flex items-center text-sm hover:bg-gray-hover ${location.pathname.includes("broadcast") ? "border-b-2 border-b-blue-dark text-blue-dark" : "border-none text-black"}`}
              >
                Diffuser des missions
              </Link>
              {publisher.hasApiRights || publisher.hasCampaignRights ? (
                <Link
                  to="/settings"
                  className={`px-6 h-full flex items-center text-sm hover:bg-gray-hover ${location.pathname.includes("settings") ? "border-b-2 border-b-blue-dark text-blue-dark" : "border-none text-black"}`}
                >
                  Paramètres
                </Link>
              ) : null}
            </>
          ) : (
            <>
              <Link
                to="/my-missions"
                className={`px-6 h-full flex items-center text-sm hover:bg-gray-hover ${location.pathname.includes("my-missions") ? "border-b-2 border-b-blue-dark text-blue-dark" : "border-none text-black"}`}
              >
                Vos missions
              </Link>
              <Link
                to="/settings"
                className={`px-6 h-full flex items-center text-sm hover:bg-gray-hover ${location.pathname.includes("settings") ? "border-b-2 border-b-blue-dark text-blue-dark" : "border-none text-black"}`}
              >
                Paramètres
              </Link>
            </>
          )}
        </div>

        <div className="flex h-full items-center gap-6">
          {publishers.length > 1 && <PublisherMenu options={publishers} value={publisher} onChange={handleChangePublisher} />}
          {user.role === "admin" && <AdminMenu />}
        </div>
      </div>
    </nav>
  );
};

const FluxMenu = ({ value, onChange }) => (
  <Menu>
    <MenuButton className="bg-blue-dark w-44 px-4 py-2 flex items-center justify-between rounded-full text-white text-sm">
      <span>Mode {value === "to" ? "annonceur" : "diffuseur"}</span>

      <RiArrowDownSFill className="text-base" />
    </MenuButton>

    <MenuItems
      transition
      anchor="bottom start"
      className="w-64 origin-top-left mt-2 bg-white border border-gray-border divide-y divide-gray-border shadow-lg focus:outline-none transition duration-200 ease-out data-[closed]:scale-95 data-[closed]:opacity-0"
    >
      {value === "to" ? (
        <>
          <MenuItem>
            <button className="w-full p-4 text-sm text-left data-[focus]:bg-gray-hover flex items-center justify-between" onClick={() => onChange("to")}>
              <span>Mode annonceur</span>
              <RiCheckLine className="text-lg text-[#00A95F]" />
            </button>
          </MenuItem>
          <MenuItem>
            <button className="w-full p-4 text-sm text-left data-[focus]:bg-gray-hover flex items-center justify-between" onClick={() => onChange("from")}>
              <span>Mode diffuseur</span>
              <RiArrowLeftRightLine className="text-lg text-blue-dark" />
            </button>
          </MenuItem>
        </>
      ) : (
        <>
          <MenuItem>
            <button className="w-full p-4 text-sm text-left data-[focus]:bg-gray-hover flex items-center justify-between" onClick={() => onChange("from")}>
              <span>Mode diffuseur</span>
              <RiCheckLine className="text-lg text-[#00A95F]" />
            </button>
          </MenuItem>
          <MenuItem>
            <button className="w-full p-4 text-sm text-left data-[focus]:bg-gray-hover flex items-center justify-between" onClick={() => onChange("to")}>
              <span>Mode annonceur</span>
              <RiArrowLeftRightLine className="text-lg text-blue-dark" />
            </button>
          </MenuItem>
        </>
      )}
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
        className="flex h-full cursor-pointer items-center justify-between gap-4 px-4 text-sm hover:bg-gray-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-[#015fcc]"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="font-semibold">{value.name}</span>
        <RiArrowDownSLine className={`text-lg ${isOpen ? "transform rotate-180" : ""}`} />
      </button>

      <div className={`absolute z-10 origin-top-right mt-1 transition duration-200 ease-in-out ${isOpen ? "" : "scale-95 opacity-0 pointer-events-none"}`}>
        {isOpen && (
          <div className={`w-72 bg-white border border-gray-border shadow-lg focus:outline-none`}>
            <div className="flex items-center gap-4 p-3 border-b border-gray-border focus-visible:ring-2 focus-visible:ring-[#015fcc]">
              <RiSearchLine />
              <label htmlFor="publisher-search" className="sr-only">
                Rechercher un partenaire
              </label>
              <input id="publisher-search" name="publisher-search" className="w-full focus:outline-none" onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="max-h-80 overflow-y-scroll">
              {options
                .filter((option) => option.name.toLowerCase().includes(search.toLowerCase()))
                .map((option, index) => (
                  <button
                    key={index}
                    className="w-full border-b border-gray-border p-4 text-sm text-left hover:bg-gray-hover focus:outline-none focus-visible:bg-gray-hover focus-visible:ring-1 focus-visible:ring-[#015fcc] flex items-center justify-between"
                    onClick={() => {
                      setSearch("");
                      setIsOpen(false);
                      onChange(option);
                    }}
                  >
                    <span>{option.name}</span>
                    {value._id === option._id && <RiCheckLine className="text-lg text-blue-dark" />}
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
        <MenuButton className="flex h-full cursor-pointer items-center justify-between gap-4 px-4 text-sm data-[focus]:bg-gray-hover hover:bg-gray-hover">
          <span className="font-semibold">Administration</span>
          <RiArrowDownSLine className={`text-lg ${open ? "transform rotate-180" : ""}`} />
        </MenuButton>
        <MenuItems
          transition
          anchor="bottom end"
          className="w-64 origin-top-right mt-1 bg-white border border-gray-border divide-y divide-gray-border shadow-lg focus:outline-none transition duration-200 ease-out data-[closed]:scale-95 data-[closed]:opacity-0"
        >
          <MenuItem>
            <Link to="/admin-account" className="block w-full p-4 text-sm data-[focus]:bg-gray-hover">
              Comptes
            </Link>
          </MenuItem>
          <MenuItem>
            <Link to="/admin-mission" className="block w-full p-4 text-sm data-[focus]:bg-gray-hover">
              Missions
            </Link>
          </MenuItem>
          <MenuItem>
            <Link to="/admin-organization" className="block w-full p-4 text-sm data-[focus]:bg-gray-hover">
              Organisations
            </Link>
          </MenuItem>
          <MenuItem>
            <Link to="/admin-stats" className="block w-full p-4 text-sm data-[focus]:bg-gray-hover">
              Statistiques
            </Link>
          </MenuItem>
          <MenuItem>
            <Link to="/admin-warning" className="block w-full p-4 text-sm data-[focus]:bg-gray-hover">
              Alertes
            </Link>
          </MenuItem>
          <MenuItem>
            <Link to="/admin-report" className="block w-full p-4 text-sm data-[focus]:bg-gray-hover">
              Rapports d'impacts
            </Link>
          </MenuItem>
        </MenuItems>
      </>
    )}
  </Menu>
);

export default Nav;
