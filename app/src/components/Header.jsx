import { useEffect, useId, useRef, useState } from "react";
import { RiArrowDownSLine, RiArrowDropRightLine, RiBookletLine, RiDashboard3Line, RiUserLine } from "react-icons/ri";
import { Link, useLocation } from "react-router-dom";

import LogoSvg from "@/assets/svg/logo.svg?react";

import Nav from "@/components/Nav";
import { WARNINGS } from "@/constants";
import api from "@/services/api";
import { captureError } from "@/services/error";
import useStore from "@/services/store";
import { slugify } from "@/utils/string";

import deviseSrc from "@/assets/svg/gouv-devise.svg";
import marianneBanner from "@/assets/svg/marianne-banner.svg";

const Header = () => {
  const { user } = useStore();
  return (
    <header role="banner" className="w-full bg-white">
      <div className="border-b-grey-border flex w-full justify-center border-b">
        <div className="flex w-full max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-1 sm:py-3">
          <Link className="hover:bg-gray-975 flex items-center gap-4 p-2 sm:p-4" to={user ? "/" : "/login"}>
            <div className="flex h-24 items-center justify-center">
              <div className="flex flex-col items-start">
                <img src={marianneBanner} alt="" aria-hidden="true" className="mb-1 w-10" />
                <p className="text-xs leading-3 font-bold text-black uppercase">
                  République
                  <br />
                  française
                </p>
                <img src={deviseSrc} alt="" aria-hidden="true" className="mt-1 h-7" />
              </div>
            </div>
            <LogoSvg alt="" className="hidden w-8 sm:block" aria-hidden="true" />
            <div className="hidden sm:block">
              <p className="text-xl font-bold">API Engagement</p>
              <p className="text-sm">Plateforme de partage de missions de bénévolat et de volontariat</p>
            </div>
          </Link>
          <nav role="navigation" aria-label="Menu principal" className="text-blue-france relative flex items-center gap-3 text-sm">
            <a href="https://doc.api-engagement.beta.gouv.fr/" target="_blank" className="text-blue-france flex items-center" aria-label="Documentation">
              <RiBookletLine className="mr-2" aria-hidden="true" />
              <span className="hidden sm:block">Documentation</span>
            </a>

            {!user ? (
              <Link to="/login" className="tertiary-btn flex items-center">
                <RiUserLine className="mr-2" aria-hidden="true" />
                Connexion
              </Link>
            ) : (
              <>
                <NotificationMenu />
                <AccountMenu />
              </>
            )}
          </nav>
        </div>
      </div>
      {user ? <Nav /> : null}
    </header>
  );
};

const NotificationMenu = () => {
  const [warnings, setWarnings] = useState([]);
  const [state, setState] = useState({});
  const [show, setShow] = useState(false);
  const ref = useRef(null);
  const buttonRef = useRef(null);
  const panelId = useId();
  const location = useLocation();
  const { user, publisher } = useStore();
  const publisherId = publisher?.id;
  const isAdmin = user.role === "admin";
  const warningPath = isAdmin ? "/admin-warning" : `/${publisherId}/warning`;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const resW = await api.post("/warning/search", isAdmin ? { fixed: false } : { publisherId, fixed: false });
        if (!resW.ok) {
          throw resW;
        }
        setWarnings(resW.data);

        const resS = await api.get(isAdmin ? "/warning/admin-state" : "/warning/state");
        if (!resS.ok) {
          throw resS;
        }
        setState(resS.data);
      } catch (error) {
        captureError(error, { extra: { publisherId } });
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setShow(false);
      }
    };
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  useEffect(() => {
    setShow(false);
  }, [location]);

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

  const maxWarnings = isAdmin ? 3 : 2;
  const stateMessage = isAdmin
    ? state.success / state.imports < 0.9
      ? `${Math.round(((state.imports - state.success) * 100) / state.imports)}% des imports ont généré une erreur`
      : new Date(state.last) < new Date(Date.now() - 1000 * 60 * 60 * 24)
        ? "Le dernier import réalisé il y a plus de 24h"
        : "L'API Engagement est parfaitement opérationnelle"
    : !state.up
      ? "L'API Engagement est rencontre quelques problèmes en ce moment"
      : !state.upToDate
        ? "Le dernier import réalisé il y a plus de 24h"
        : "L'API Engagement est parfaitement opérationnelle";

  return (
    // eslint-disable-next-line jsx-a11y-x/no-static-element-interactions -- Le conteneur délègue Échap et la sortie du focus aux éléments interactifs du menu.
    <div ref={ref} onBlur={handleFocusOut} onKeyDown={handleKeyDown}>
      <button
        ref={buttonRef}
        type="button"
        className="hover:bg-gray-975 relative p-2 text-lg"
        onClick={() => setShow(!show)}
        aria-label="Menu des alertes"
        aria-expanded={show}
        aria-controls={panelId}
      >
        <RiDashboard3Line aria-hidden="true" />
        {warnings.length > 0 && <div className="bg-error absolute top-2 right-1.5 h-2.25 w-2.25 rounded-full border border-white" />}
      </button>

      <div
        id={panelId}
        inert={!show ? true : undefined}
        className={`border-grey-border absolute top-full right-0 z-10 mt-2 w-[calc(100vw-2rem)] origin-top-right border bg-white text-black shadow-lg transition-[max-height,opacity] duration-200 ease-in-out sm:w-100 ${show ? "scale-100 opacity-100" : "pointer-events-none scale-95 opacity-0"}`}
      >
        <div className="flex items-center justify-between p-6">
          <h3 className="m-0 text-lg font-bold text-black">État du service</h3>
          <Link to={warningPath} className="text-blue-france flex items-center">
            <span>Détails</span>
            <RiArrowDropRightLine className="mt-1 text-lg" aria-hidden="true" />
          </Link>
        </div>
        {state && (
          <Link to={warningPath} className="border-grey-border flex items-center justify-between gap-6 border-t p-6 hover:bg-gray-950">
            <div className="flex w-6 items-center">
              <LogoSvg alt="" aria-hidden="true" />
            </div>
            <div className="flex flex-1 flex-col gap-2">
              <p className="text-base font-bold text-black">{stateMessage}</p>
            </div>
          </Link>
        )}
        {warnings.length ? (
          <>
            {!isAdmin && (
              <Link to={warningPath} className="border-grey-border flex items-center justify-between gap-6 border-t p-6 hover:bg-gray-950">
                <div className="flex w-6 items-center">
                  <span aria-hidden="true">❌</span>
                </div>
                <div className="flex flex-1 flex-col gap-2">
                  <p className="text-base font-bold text-black">Il semble y avoir un problème de paramétrage de votre côté.</p>
                </div>
              </Link>
            )}
            {warnings.slice(0, maxWarnings).map((w, index) => {
              const label = WARNINGS[w.type] || WARNINGS.OTHER_WARNING;
              return (
                <Link
                  key={index}
                  to={isAdmin ? { pathname: warningPath, hash: slugify(`${w.type}-${w.publisherName}`) } : warningPath}
                  className="border-grey-border flex items-center justify-between gap-6 border-t p-6 hover:bg-gray-950"
                >
                  <div className="flex w-6 items-center">{label.emoji}</div>
                  <div className="flex flex-1 flex-col gap-2">
                    {isAdmin && <p className="text-text-mention m-0 text-xs">{w.publisherName}</p>}
                    <div>
                      <span className="bg-yellow-tournesol-950 text-yellow-tournesol-200 truncate rounded p-1 text-center text-xs font-semibold uppercase">{label.name}</span>
                    </div>
                    <h4 className="m-0 text-sm font-bold text-black">{w.title}</h4>
                    <p className="text-text-mention m-0 text-xs">{new Date(w.createdAt).toLocaleDateString("fr-FR")}</p>
                  </div>
                  {!isAdmin && (
                    <div className="flex w-6 items-center justify-center">
                      <div className="bg-error h-3 w-3 rounded-full" />
                    </div>
                  )}
                </Link>
              );
            })}
            {warnings.length > maxWarnings && (
              <Link to={warningPath} className="border-grey-border flex items-center justify-end gap-6 border-t p-6 hover:bg-gray-950">
                <div className="text-blue-france flex">
                  <span>Voir toutes les alertes</span>
                  <RiArrowDropRightLine className="mt-1 text-lg" aria-hidden="true" />
                </div>
              </Link>
            )}
          </>
        ) : (
          <Link to={warningPath} className="border-grey-border flex items-center justify-between gap-6 border-t p-6 hover:bg-gray-950">
            <div className="flex w-6 items-center">
              <span aria-hidden="true">✅</span>
            </div>
            <div className="flex flex-1 flex-col gap-2">
              <p className="text-base font-bold text-black">Les comptes partenaires semblent parfaitement opérationnels</p>
            </div>
          </Link>
        )}
      </div>
    </div>
  );
};

const AccountMenu = () => {
  const { user, publisher, setAuth } = useStore();
  const publisherId = publisher?.id;
  const location = useLocation();
  const [show, setShow] = useState(false);
  const ref = useRef(null);
  const buttonRef = useRef(null);
  const panelId = useId();

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

  const handleLogout = async () => {
    api.removeToken();
    setAuth(null, null);
  };

  return (
    // eslint-disable-next-line jsx-a11y-x/no-static-element-interactions -- Le conteneur délègue Échap et la sortie du focus aux éléments interactifs du menu.
    <div className="relative" ref={ref} onBlur={handleFocusOut} onKeyDown={handleKeyDown}>
      <button
        ref={buttonRef}
        className="btn hover:bg-gray-975 focus"
        type="button"
        onClick={() => setShow(!show)}
        aria-label="Menu du compte"
        aria-expanded={show}
        aria-controls={panelId}
      >
        <div className="bg-blue-france flex h-8 w-8 items-center justify-center rounded-full">
          <RiUserLine className="text-white" aria-hidden="true" />
        </div>
        <div className="mx-4 hidden text-left sm:block">
          <p className="text-blue-france">{user.firstname}</p>
          <p className="text-text-mention text-sm">{user.publishers.length ? (user.role === "admin" ? "Administrateur" : "Utilisateur") : publisher.name}</p>
        </div>
        <RiArrowDownSLine className={`hidden text-base transition-transform duration-200 sm:block ${show ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>

      <div
        id={panelId}
        inert={!show ? true : undefined}
        className={`border-grey-border absolute right-0 z-10 w-[calc(100vw-2rem)] border bg-white shadow-lg transition-[max-height,opacity] duration-200 ease-in-out sm:w-56 ${show ? "max-h-96 opacity-100" : "pointer-events-none max-h-0 opacity-0"}`}
      >
        <ul className="m-0 flex list-none flex-col p-0">
          <li>
            <Link to={`/${publisherId}/my-account`} className="nav-link" aria-current={location.pathname.startsWith(`/${publisherId}/my-account`) ? "page" : undefined}>
              Mon compte
            </Link>
          </li>
          <li>
            <button type="button" className="nav-link" onClick={handleLogout}>
              Se déconnecter
            </button>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default Header;
