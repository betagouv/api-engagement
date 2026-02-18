import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { useEffect, useState } from "react";
import { RiArrowDownSLine, RiArrowDropRightLine, RiBookletLine, RiDashboard3Line, RiUserLine } from "react-icons/ri";
import { Link } from "react-router-dom";

import LogoSvg from "../assets/svg/logo.svg?react";
import { WARNINGS } from "../constants";
import api from "../services/api";
import { captureError } from "../services/error";
import useStore from "../services/store";
import { slugify } from "../services/utils";

const Header = () => {
  const { user } = useStore();
  return (
    <header role="banner" className="border-b-grey-border flex w-full justify-center border-b bg-white">
      <div className="flex w-full max-w-7xl flex-wrap items-center justify-between gap-4 py-3">
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
        <nav role="navigation" aria-label="Navigation d'en-tête" className="text-blue-france flex items-center gap-3 text-sm">
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
        </nav>
      </div>
    </header>
  );
};

const NotificationMenu = () => {
  const [warnings, setWarnings] = useState([]);
  const [state, setState] = useState({});
  const { publisher } = useStore();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const resW = await api.post("/warning/search", { publisherId: publisher.id, fixed: false });
        if (!resW.ok) throw resW;
        setWarnings(resW.data);

        const resS = await api.get("/warning/state");
        if (!resS.ok) throw resS;
        setState(resS.data);
      } catch (error) {
        captureError(error, { extra: { publisherId: publisher.id } });
      }
    };
    fetchData();
  }, []);

  return (
    <Menu>
      <MenuButton as="div" className="data-[focus]:bg-gray-975 hover:bg-gray-975 relative p-2 text-lg">
        <RiDashboard3Line />
        {warnings.length > 0 && <div className="bg-error absolute top-2 right-1.5 h-[9px] w-[9px] rounded-full border border-white" />}
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
            <Link to="/warning" className="border-grey-border flex items-center justify-between gap-6 border-t p-6 hover:bg-gray-950">
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
              <Link to="/warning" className="border-grey-border flex items-center justify-between gap-6 border-t p-6 hover:bg-gray-950">
                <div className="flex w-6 items-center">
                  <span aria-hidden="true">❌</span>
                </div>
                <div className="flex flex-1 flex-col gap-2">
                  <p className="text-base font-bold text-black">Il semble y avoir un problème de paramétrage de votre côté.</p>
                </div>
              </Link>
            </MenuItem>
            {warnings.slice(0, 2).map((w, index) => {
              const label = WARNINGS[w.type] || WARNINGS.OTHER_WARNING;
              return (
                <MenuItem key={index}>
                  <Link to="/warning" className="border-grey-border flex items-center justify-between gap-6 border-t p-6 hover:bg-gray-950">
                    <div className="flex w-6 items-center">{label.emoji}</div>
                    <div className="flex flex-1 flex-col gap-2">
                      <div>
                        <span className="bg-yellow-tournesol-950 text-yellow-tournesol-200 truncate rounded p-1 text-center text-xs font-semibold uppercase">{label.name}</span>
                      </div>
                      <h4 className="m-0 text-sm font-bold text-black">{w.title}</h4>
                      <p className="text-text-mention m-0 text-xs">{new Date(w.createdAt).toLocaleDateString("fr-FR")}</p>
                    </div>
                    <div className="flex w-6 items-center justify-center">
                      <div className="bg-error h-3 w-3 rounded-full" />
                    </div>
                  </Link>
                </MenuItem>
              );
            })}
            {warnings.length > 2 && (
              <MenuItem>
                <Link to="/warning" className={`border-grey-border flex items-center justify-end gap-6 border-t p-6 hover:bg-gray-950`}>
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
            <Link to="/warning" className="border-grey-border flex items-center justify-between gap-6 border-t p-6 hover:bg-gray-950">
              <div className="flex w-6 items-center">
                <span aria-hidden="true">✅</span>
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
        const resW = await api.post("/warning/search", { fixed: false });
        if (!resW.ok) throw resW;
        setWarnings(resW.data);

        const resS = await api.get("/warning/admin-state");
        if (!resS.ok) throw resS;
        setState(resS.data);
      } catch (error) {
        captureError(error);
      }
    };
    fetchData();
  }, []);

  return (
    <Menu>
      <MenuButton className="data-[focus]:bg-gray-975 hover:bg-gray-975 relative p-2 text-lg">
        <RiDashboard3Line />
        {warnings.length > 0 && <div className="bg-error absolute top-2 right-1.5 h-[9px] w-[9px] rounded-full border border-white" />}
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
            <Link to="/admin-warning" className="border-grey-border flex items-center justify-between gap-6 border-t p-6 hover:bg-gray-950">
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
            {warnings.slice(0, 3).map((w, index) => {
              const label = WARNINGS[w.type] || WARNINGS.OTHER_WARNING;
              return (
                <MenuItem key={index}>
                  <Link
                    to={{
                      pathname: `/admin-warning`,
                      hash: slugify(`${w.type}-${w.publisherName}`),
                    }}
                    className="border-grey-border flex items-center justify-between gap-6 border-t p-6 hover:bg-gray-950"
                  >
                    <div className="flex w-6 items-center">{label.emoji}</div>
                    <div className="flex flex-1 flex-col gap-2">
                      <p className="text-text-mention m-0 text-xs">{w.publisherName}</p>
                      <div>
                        <span className="bg-yellow-tournesol-950 text-yellow-tournesol-200 truncate rounded p-1 text-center text-xs font-semibold uppercase">{label.name}</span>
                      </div>
                      <h4 className="m-0 text-sm font-bold text-black">{w.title}</h4>
                      <p className="text-text-mention m-0 text-xs">{new Date(w.createdAt).toLocaleDateString("fr-FR")}</p>
                    </div>
                  </Link>
                </MenuItem>
              );
            })}
            {warnings.length > 3 && (
              <MenuItem>
                <Link to={`/admin-warning`} className={`border-grey-border flex items-center justify-end gap-6 border-t p-6 hover:bg-gray-950`}>
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
            <Link to="/admin-warning" className="border-grey-border flex items-center justify-between gap-6 border-t p-6 hover:bg-gray-950">
              <div className="flex w-6 items-center">
                <span aria-hidden="true">✅</span>
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
          <p className="text-text-mention text-sm">{user.publishers.length ? (user.role === "admin" ? "Administrateur" : "Utilisateur") : publisher.name}</p>
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
