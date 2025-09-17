import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { useEffect, useState } from "react";
import { RiArrowDownSLine, RiArrowDropRightLine, RiBookletLine, RiDashboard3Line, RiUserLine } from "react-icons/ri";
import { Link } from "react-router-dom";

import LogoSvg from "../assets/svg/logo.svg?react";
import api from "../services/api";
import { captureError } from "../services/error";
import useStore from "../services/store";
import { slugify } from "../services/utils";

const Header = () => {
  const { user } = useStore();
  return (
    <header className="flex w-full justify-center border-b border-b-[#dddddd] bg-white">
      <div className="flex w-full max-w-7xl items-center justify-between py-3">
        <Link className="hover:bg-gray-975 flex items-center gap-4 p-4" to={user ? "/" : "/login"}>
          <div className="flex h-24 items-center justify-center">
            <p className="gouv-logo text-xs leading-3 font-bold text-black uppercase">
              République
              <br />
              française
            </p>
          </div>
          <LogoSvg alt="API Engagement" className="w-8" />
          <div>
            <h1 className="text-xl font-bold">API Engagement</h1>
            <p className="text-sm">Plateforme de partage de missions de bénévolat et de volontariat</p>
          </div>
        </Link>
        <div className="text-blue-france flex items-center gap-3 text-sm">
          <div className="tertiary-bis-btn flex items-center">
            <RiBookletLine className="mr-2" />
            <a href="https://doc.api-engagement.beta.gouv.fr/" target="_blank">
              Documentation
            </a>
          </div>
          {!user ? (
            <Link to="/login" className="tertiary-btn flex items-center">
              <RiUserLine className="mr-2" />
              Connexion
            </Link>
          ) : (
            <>
              {user.role === "admin" ? <AdminNotificationMenu /> : <NotificationMenu />}
              <AccountMenu />
            </>
          )}
        </div>
      </div>
    </header>
  );
};

const WARNINGS = {
  EMPTY_WARNING: {
    emoji: "🙁",
    name: "Flux vide",
  },
  ERROR_WARNING: {
    emoji: "❌",
    name: "Erreur de flux",
  },
  VALIDATION_WARNING: {
    emoji: "🙅",
    name: "Taux de validation critique",
  },
  TRACKING_WARNING: {
    emoji: "🤔",
    name: "Problème de tracking",
  },
};

const NotificationMenu = () => {
  const [warnings, setWarnings] = useState([]);
  const [state, setState] = useState({});
  const { publisher } = useStore();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const resW = await api.get(`/warning/${publisher._id}`);
        if (!resW.ok) throw resW;
        setWarnings(resW.data);

        const resS = await api.get(`/warning/state`);
        if (!resS.ok) throw resS;
        setState(resS.data);
      } catch (error) {
        captureError(error, "Erreur lors de la récupération des alertes en cours");
      }
    };
    fetchData();
  }, []);

  return (
    <Menu>
      <MenuButton as="div" className="data-[focus]:bg-gray-975 hover:bg-gray-975 relative p-2 text-lg">
        <RiDashboard3Line />
        {warnings.length > 0 && <div className="absolute top-2 right-1.5 h-[9px] w-[9px] rounded-full border border-white bg-[#ff5655]" />}
      </MenuButton>

      <MenuItems
        transition
        anchor="bottom end"
        className="mt-2 w-[400px] origin-top-right bg-white text-black shadow-lg transition duration-200 ease-out focus:outline-none data-closed:scale-95 data-closed:opacity-0"
      >
        <MenuItem>
          <div className="flex items-center justify-between p-6">
            <h3 className="m-0 text-lg font-bold text-black">État du service</h3>
            <Link to="/warning" className="text-blue-france flex items-center">
              <span>Détails</span>
              <RiArrowDropRightLine className="mt-1 text-lg" />
            </Link>
          </div>
        </MenuItem>
        {state && (
          <MenuItem>
            <Link to="/warning" className="flex items-center justify-between gap-6 border-t border-gray-900 p-6 hover:bg-gray-950">
              <div className="flex w-6 items-center">
                <LogoSvg alt="API Engagement" />
              </div>
              <div className="flex flex-1 flex-col gap-2">
                <p className="text-base font-bold text-black">
                  {!state.up
                    ? "L'API Engagement est rencontre quelques problèmes en ce moment"
                    : !state.upToDate
                      ? "Le dernier import réalisé il y a plus de 24h"
                      : "L'API Engagement est parfaitement opérationnelle"}
                </p>
              </div>
            </Link>
          </MenuItem>
        )}
        {warnings.length ? (
          <>
            <MenuItem>
              <Link to="/warning" className="flex items-center justify-between gap-6 border-t border-gray-900 p-6 hover:bg-gray-950">
                <div className="flex w-6 items-center">
                  <span>❌</span>
                </div>
                <div className="flex flex-1 flex-col gap-2">
                  <p className="text-base font-bold text-black">Il semble y avoir un problème de paramétrage de votre côté.</p>
                </div>
              </Link>
            </MenuItem>
            {warnings.slice(0, 2).map((w) => {
              const label = WARNINGS[w.type] || { emoji: "🤔", name: w.type };
              return (
                <MenuItem key={w._id}>
                  <Link to="/warning" className="flex items-center justify-between gap-6 border-t border-gray-900 p-6 hover:bg-gray-950">
                    <div className="flex w-6 items-center">
                      <span>{label.emoji}</span>
                    </div>
                    <div className="flex flex-1 flex-col gap-2">
                      <div>
                        <span className="bgbg-[#FEECC2] textbg-[#716043] truncate rounded p-1 text-center text-xs font-semibold uppercase">{label.name}</span>
                      </div>
                      <h4 className="m-0 text-sm font-bold text-black">{w.title}</h4>
                      <p className="text-gray-425 m-0 text-xs">{new Date(w.createdAt).toLocaleDateString("fr-FR")}</p>
                    </div>
                    <div className="flex w-6 items-center justify-center">
                      <div className="h-3 w-3 rounded-full bg-[#ff5655]" />
                    </div>
                  </Link>
                </MenuItem>
              );
            })}
            {warnings.length > 2 && (
              <MenuItem>
                <Link to="/warning" className={`flex items-center justify-end gap-6 border-t border-gray-900 p-6 hover:bg-gray-950`}>
                  <div className="text-blue-france flex">
                    <span>Voir toutes les alertes</span>
                    <RiArrowDropRightLine className="mt-1 text-lg" />
                  </div>
                </Link>
              </MenuItem>
            )}
          </>
        ) : (
          <MenuItem>
            <Link to="/warning" className="flex items-center justify-between gap-6 border-t border-gray-900 p-6 hover:bg-gray-950">
              <div className="flex w-6 items-center">
                <span>✅</span>
              </div>
              <div className="flex flex-1 flex-col gap-2">
                <p className="text-base font-bold text-black">Les comptes partenaires semblent parfaitement opérationnels</p>
              </div>
            </Link>
          </MenuItem>
        )}
      </MenuItems>
    </Menu>
  );
};

const AdminNotificationMenu = () => {
  const [warnings, setWarnings] = useState([]);
  const [state, setState] = useState({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        const resW = await api.get(`/warning`);
        if (!resW.ok) throw resW;
        setWarnings(resW.data);

        const resS = await api.get(`/warning/admin-state`);
        if (!resS.ok) throw resS;
        setState(resS.data);
      } catch (error) {
        captureError(error, "Erreur lors de la récupération des alertes en cours");
      }
    };
    fetchData();
  }, []);

  return (
    <Menu>
      <MenuButton className="data-[focus]:bg-gray-975 hover:bg-gray-975 relative p-2 text-lg">
        <RiDashboard3Line />
        {warnings.length > 0 && <div className="absolute top-2 right-1.5 h-[9px] w-[9px] rounded-full border border-white bg-[#ff5655]" />}
      </MenuButton>
      <MenuItems
        transition
        anchor="bottom end"
        className="w-[400px] origin-top-right bg-white text-black shadow-lg transition duration-200 ease-out focus:outline-none data-closed:scale-95 data-closed:opacity-0"
      >
        <MenuItem>
          <div className="flex items-center justify-between p-6">
            <h3 className="m-0 text-lg font-bold text-black">État du service</h3>
            <Link to="/admin-warning" className="text-blue-france flex items-center">
              <span>Détails</span>
              <RiArrowDropRightLine className="mt-1 text-lg" />
            </Link>
          </div>
        </MenuItem>
        {state && (
          <MenuItem>
            <Link to="/admin-warning" className="flex items-center justify-between gap-6 border-t border-gray-900 p-6 hover:bg-gray-950">
              <div className="flex w-6 items-center">
                <LogoSvg alt="API Engagement" />
              </div>
              <div className="flex flex-1 flex-col gap-2">
                <p className="text-base font-bold text-black">
                  {state.success / state.imports < 0.9
                    ? `${Math.round(((state.imports - state.success) * 100) / state.imports)}% des imports ont généré une erreur`
                    : new Date(state.last) < new Date(Date.now() - 1000 * 60 * 60 * 24)
                      ? "Le dernier import réalisé il y a plus de 24h"
                      : "L'API Engagement est parfaitement opérationnelle"}
                </p>
              </div>
            </Link>
          </MenuItem>
        )}
        {warnings.length ? (
          <>
            {warnings.slice(0, 3).map((w) => {
              const label = WARNINGS[w.type] || { emoji: "🤔", name: w.type };
              return (
                <MenuItem key={w._id}>
                  <Link
                    to={{
                      pathname: `/admin-warning`,
                      hash: slugify(`${w.type}-${w.publisherName}`),
                    }}
                    className="border-gray-borde flex items-center justify-between gap-6 border-t p-6 hover:bg-gray-950"
                  >
                    <div className="flex w-6 items-center">
                      <span>{label.emoji}</span>
                    </div>
                    <div className="flex flex-1 flex-col gap-2">
                      <p className="text-gray-425 m-0 text-xs">{w.publisherName}</p>
                      <div>
                        <span className="bgbg-[#FEECC2] textbg-[#716043] truncate rounded p-1 text-center text-xs font-semibold uppercase">{label.name}</span>
                      </div>
                      <h4 className="m-0 text-sm font-bold text-black">{w.title}</h4>
                      <p className="text-gray-425 m-0 text-xs">{new Date(w.createdAt).toLocaleDateString("fr-FR")}</p>
                    </div>
                  </Link>
                </MenuItem>
              );
            })}
            {warnings.length > 3 && (
              <MenuItem>
                <Link to={`/admin-warning`} className={`flex items-center justify-end gap-6 border-t border-gray-900 p-6 hover:bg-gray-950`}>
                  <div className="text-blue-france flex">
                    <span>Voir toutes les alertes</span>
                    <RiArrowDropRightLine className="mt-1 text-lg" />
                  </div>
                </Link>
              </MenuItem>
            )}
          </>
        ) : (
          <MenuItem>
            <Link to="/admin-warning" className="flex items-center justify-between gap-6 border-t border-gray-900 p-6 hover:bg-gray-950">
              <div className="flex w-6 items-center">
                <span>✅</span>
              </div>
              <div className="flex flex-1 flex-col gap-2">
                <p className="text-base font-bold text-black">Les comptes partenaires semblent parfaitement opérationnels</p>
              </div>
            </Link>
          </MenuItem>
        )}
      </MenuItems>
    </Menu>
  );
};

const AccountMenu = () => {
  const { user, publisher, setAuth } = useStore();

  const handleLogout = async () => {
    api.removeToken();
    setAuth(null, null);
  };

  return (
    <Menu>
      <MenuButton className="btn data-[focus]:bg-gray-975 hover:bg-gray-975 flex cursor-pointer items-center gap-4">
        <div className="bg-blue-france flex h-8 w-8 items-center justify-center rounded-full">
          <RiUserLine className="text-white" />
        </div>
        <div className="space-y-0 text-left">
          <p className="text-blue-france">{user.firstname}</p>
          <p className="text-gray-425 text-sm">{user.publishers.length ? (user.role === "admin" ? "Administrateur" : "Utilisateur") : publisher.name}</p>
        </div>
        <RiArrowDownSLine className="text-base" />
      </MenuButton>

      <MenuItems
        transition
        anchor="bottom end"
        className="w-52 origin-top-right bg-white shadow-lg transition duration-200 ease-out focus:outline-none data-closed:scale-95 data-closed:opacity-0"
      >
        <MenuItem>
          <Link to="my-account" className="data-[focus]:bg-gray-975 block w-full p-4 text-sm">
            Mon compte
          </Link>
        </MenuItem>
        <MenuItem>
          <button className="data-[focus]:bg-gray-975 w-full p-4 text-left text-sm" onClick={handleLogout}>
            Se déconnecter
          </button>
        </MenuItem>
      </MenuItems>
    </Menu>
  );
};

export default Header;
