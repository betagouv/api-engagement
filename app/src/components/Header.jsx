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
    <header className="flex w-full justify-center border-b border-b-[#ddd] bg-white">
      <div className="w-full max-w-[78rem] flex items-center justify-between py-3">
        <Link className="flex items-center gap-4 p-4 hover:bg-gray-hover" to={user ? "/" : "/login"}>
          <div className="h-24 flex items-center justify-center">
            <p className="gouv-logo text-xs font-bold uppercase leading-3 text-black">
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
        <div className="flex items-center gap-3 text-sm text-blue-dark">
          <div className="flex items-center gap-2 p-2 hover:bg-gray-hover">
            <RiBookletLine />
            <a href="https://doc.api-engagement.beta.gouv.fr/" target="_blank">
              Documentation
            </a>
          </div>
          {!user ? (
            <Link to="/login" className="button flex cursor-pointer items-center border border-gray-border hover:bg-gray-hover">
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
      <MenuButton as="div" className="relative p-2 text-lg data-[focus]:bg-gray-hover hover:bg-gray-hover">
        <RiDashboard3Line />
        {warnings.length > 0 && <div className="absolute right-1.5 top-2 h-[9px] w-[9px] rounded-full border border-white bg-red-notif"></div>}
      </MenuButton>

      <MenuItems
        transition
        anchor="bottom end"
        className="mt-2 w-[400px] origin-top-right bg-white text-black shadow-lg focus:outline-none transition duration-200 ease-out data-[closed]:scale-95 data-[closed]:opacity-0"
      >
        <MenuItem>
          <div className="flex items-center justify-between p-6">
            <h3 className="m-0 text-lg font-bold text-black">État du service</h3>
            <Link to="/warning" className="flex items-center text-blue-dark">
              <span>Détails</span>
              <RiArrowDropRightLine className="mt-1 text-lg" />
            </Link>
          </div>
        </MenuItem>
        {state && (
          <MenuItem>
            <Link to="/warning" className="flex items-center justify-between gap-6 p-6 hover:bg-gray-light border-t border-gray-border">
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
              <Link to="/warning" className="flex items-center justify-between gap-6 p-6 hover:bg-gray-light border-t border-gray-border">
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
                  <Link to="/warning" className="flex items-center justify-between gap-6 p-6 hover:bg-gray-light border-t border-gray-border">
                    <div className="flex w-6 items-center">
                      <span>{label.emoji}</span>
                    </div>
                    <div className="flex flex-1 flex-col gap-2">
                      <div>
                        <span className="truncate rounded bg-orange-light p-1 text-center text-xs font-semibold uppercase text-orange-dark">{label.name}</span>
                      </div>
                      <h4 className="m-0 text-sm font-bold text-black">{w.title}</h4>
                      <p className="m-0 text-xs text-gray-dark">{new Date(w.createdAt).toLocaleDateString("fr-FR")}</p>
                    </div>
                    <div className="flex w-6 items-center justify-center">
                      <div className="h-3 w-3 rounded-full bg-red-notif" />
                    </div>
                  </Link>
                </MenuItem>
              );
            })}
            {warnings.length > 2 && (
              <MenuItem>
                <Link to="/warning" className={`flex items-center justify-end gap-6 p-6 hover:bg-gray-light border-t border-gray-border`}>
                  <div className="flex text-blue-dark">
                    <span>Voir toutes les alertes</span>
                    <RiArrowDropRightLine className="mt-1 text-lg" />
                  </div>
                </Link>
              </MenuItem>
            )}
          </>
        ) : (
          <MenuItem>
            <Link to="/warning" className="flex items-center justify-between gap-6 p-6 hover:bg-gray-light border-t border-gray-border">
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
      <MenuButton className="relative p-2 text-lg data-[focus]:bg-gray-hover hover:bg-gray-hover">
        <RiDashboard3Line />
        {warnings.length > 0 && <div className="absolute right-1.5 top-2 h-[9px] w-[9px] rounded-full border border-white bg-red-notif"></div>}
      </MenuButton>
      <MenuItems
        transition
        anchor="bottom end"
        className="w-[400px] origin-top-right bg-white text-black shadow-lg focus:outline-none transition duration-200 ease-out data-[closed]:scale-95 data-[closed]:opacity-0"
      >
        <MenuItem>
          <div className="flex items-center justify-between p-6">
            <h3 className="m-0 text-lg font-bold text-black">État du service</h3>
            <Link to="/admin-warning" className="flex items-center text-blue-dark">
              <span>Détails</span>
              <RiArrowDropRightLine className="mt-1 text-lg" />
            </Link>
          </div>
        </MenuItem>
        {state && (
          <MenuItem>
            <Link to="/admin-warning" className="flex items-center justify-between gap-6 p-6 hover:bg-gray-light border-t border-gray-border">
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
                    className="flex items-center justify-between gap-6 p-6 hover:bg-gray-light border-t border-gray-borde"
                  >
                    <div className="flex w-6 items-center">
                      <span>{label.emoji}</span>
                    </div>
                    <div className="flex flex-1 flex-col gap-2">
                      <p className="m-0 text-xs text-gray-dark">{w.publisherName}</p>
                      <div>
                        <span className="truncate rounded bg-orange-light p-1 text-center text-xs font-semibold uppercase text-orange-dark">{label.name}</span>
                      </div>
                      <h4 className="m-0 text-sm font-bold text-black">{w.title}</h4>
                      <p className="m-0 text-xs text-gray-dark">{new Date(w.createdAt).toLocaleDateString("fr-FR")}</p>
                    </div>
                  </Link>
                </MenuItem>
              );
            })}
            {warnings.length > 3 && (
              <MenuItem>
                <Link to={`/admin-warning`} className={`flex items-center justify-end gap-6 p-6 hover:bg-gray-light border-t border-gray-border`}>
                  <div className="flex text-blue-dark">
                    <span>Voir toutes les alertes</span>
                    <RiArrowDropRightLine className="mt-1 text-lg" />
                  </div>
                </Link>
              </MenuItem>
            )}
          </>
        ) : (
          <MenuItem>
            <Link to="/admin-warning" className="flex items-center justify-between gap-6 p-6 hover:bg-gray-light border-t border-gray-border">
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
      <MenuButton className="button flex cursor-pointer items-center gap-4 data-[focus]:bg-gray-hover hover:bg-gray-hover">
        <div className="bg-blue-dark w-8 h-8 flex justify-center items-center rounded-full">
          <RiUserLine className="text-white" />
        </div>
        <div className="space-y-0 text-left">
          <p className="text-blue-dark">{user.firstname}</p>
          <p className="text-sm text-gray-dark">{user.publishers.length ? (user.role === "admin" ? "Administrateur" : "Utilisateur") : publisher.name}</p>
        </div>
        <RiArrowDownSLine className="text-base" />
      </MenuButton>

      <MenuItems
        transition
        anchor="bottom end"
        className="w-52 origin-top-right bg-white shadow-lg focus:outline-none transition duration-200 ease-out data-[closed]:scale-95 data-[closed]:opacity-0"
      >
        <MenuItem>
          <Link to="my-account" className="block w-full p-4 text-sm data-[focus]:bg-gray-hover">
            Paramètres
          </Link>
        </MenuItem>
        <MenuItem>
          <button className="w-full p-4 text-sm text-left data-[focus]:bg-gray-hover" onClick={handleLogout}>
            Se deconnecter
          </button>
        </MenuItem>
      </MenuItems>
    </Menu>
  );
};

export default Header;
