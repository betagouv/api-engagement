import { useEffect, useRef, useState } from "react";
import { RiArrowDownSLine, RiArrowRightSLine, RiBookletLine, RiCheckboxCircleFill, RiErrorWarningFill, RiUserLine } from "react-icons/ri";
import { Link, useLocation } from "react-router-dom";

import LogoSvg from "@/assets/svg/logo.svg?react";

import Nav from "@/components/Nav";
import api from "@/services/api";
import { captureError } from "@/services/error";
import useStore from "@/services/store";

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
  const [count, setCount] = useState(0);
  const { user, publisher } = useStore();
  const publisherId = publisher?.id;
  const isAdmin = user.role === "admin";
  const warningPath = isAdmin ? "/admin-warning" : `/${publisherId}/warning`;

  useEffect(() => {
    const fetchCount = async () => {
      try {
        // Admin : mes alertes à traiter (la page /admin-warning est pré-filtrée sur l'utilisateur).
        const res = await api.post("/warning/search", { ...(isAdmin ? { assigneeId: user.id } : { publisherId }), status: "TODO", page: 1, size: 1 });
        if (!res.ok) {
          throw res;
        }
        setCount(res.total);
      } catch (error) {
        captureError(error, { extra: { publisherId } });
      }
    };
    fetchCount();
  }, []);

  const label = count ? `${count} alerte${count > 1 ? "s" : ""} à traiter` : "Aucune alerte à traiter";
  const allPath = "/admin-warning?assignee=";
  const linkClass = "text-blue-france flex items-center justify-end p-4 text-sm font-medium hover:bg-gray-950";

  // Menu ouvert au survol et au focus clavier (focus-within) ; le lien « Alerte(s) » reste cliquable.
  return (
    <div className="group relative">
      <Link to={warningPath} className="hover:bg-gray-975 flex items-center gap-2 p-2 text-sm font-medium" aria-label={`Alertes : ${label}`}>
        <span aria-hidden="true">Alerte(s)</span>
        {count > 0 && (
          <span className="bg-error min-w-5 rounded-full px-1.5 py-0.5 text-center text-xs font-bold text-white" aria-hidden="true">
            {count}
          </span>
        )}
      </Link>
      {isAdmin && (
        <div className="border-grey-border absolute top-full right-0 z-10 hidden w-80 border bg-white text-black shadow-lg group-focus-within:block group-hover:block">
          <p className="border-grey-border m-0 border-b p-4 text-lg font-bold">État du service</p>
          <div className="border-grey-border flex flex-col gap-1 border-b p-4">
            {count ? (
              <>
                <p className="m-0 flex items-center gap-2 text-xl font-bold">
                  <RiErrorWarningFill className="text-error" aria-hidden="true" />
                  {label}
                </p>
                <p className="text-text-mention m-0 text-xs">En attente de traitement</p>
              </>
            ) : (
              <>
                <p className="m-0 flex items-center gap-2 text-base font-bold">
                  <RiCheckboxCircleFill className="text-green-700" aria-hidden="true" />
                  {label}
                </p>
                <p className="m-0 text-sm">Aucune alerte ne vous est attribuée pour le moment.</p>
              </>
            )}
          </div>
          <Link to={count ? warningPath : allPath} className={linkClass}>
            {count ? "Voir mes alertes" : "Voir toutes les alertes"}
            <RiArrowRightSLine aria-hidden="true" />
          </Link>
        </div>
      )}
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
        aria-expanded={show}
        aria-controls="menu-compte"
      >
        <span className="sr-only">Menu du compte</span>
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
        id="menu-compte"
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
