import { useEffect, useState } from "react";
import { RiArrowRightLine, RiCheckboxCircleFill, RiCloseFill, RiMessage2Line } from "react-icons/ri";

import { Link } from "react-router-dom";
import APILogo from "../../assets/svg/logo.svg";
import Loader from "../../components/Loader";
import Select from "../../components/NewSelect";
import { DAYS, MONTHS, WARNINGS, YEARS } from "../../constants";
import api from "../../services/api";
import { captureError } from "../../services/error";
import useStore from "../../services/store";
import { slugify } from "../../services/utils";

const LINKS = {
  EMPTY_WARNING: "/announce?tab=settings",
  ERROR_WARNING: "/announce?tab=settings",
  VALIDATION_WARNING: "/?tab=missions",
  TRACKING_WARNING: "/",
};

const List = () => {
  const { publisher } = useStore();

  const [currentWarnings, setCurrentWarnings] = useState([]);
  const [archivedFilters, setArchivedFilters] = useState({
    type: "",
    month: undefined,
    year: undefined,
  });
  const [currentWarningsByDays, setCurrentByDays] = useState({});
  const [archivedWarningsByDays, setArchivedByDays] = useState({});
  const [state, setState] = useState();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const resS = await api.get(`/warning/state`);
        if (!resS.ok) throw resS;
        setState(resS.data);
        const resP = await api.post("/warning/search", { publisherId: publisher.id });
        if (!resP.ok) throw resP;
        setCurrentWarnings(resP.data);
        setCurrentByDays(
          resP.data.reduce((acc, w) => {
            const date = new Date(w.createdAt);
            const day = `${DAYS[date.getDay()]} ${date.getDate()} ${MONTHS[date.getMonth()].toLowerCase()} ${date.getFullYear()}`;
            if (!acc[day]) acc[day] = [w];
            else acc[day].push(w);
            return acc;
          }, {}),
        );
      } catch (error) {
        captureError(error, { extra: { publisherId: publisher.id } });
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const query = {
          fixed: "true",
          publisherId: publisher.id,
          type: archivedFilters.type,
          month: archivedFilters.month,
          year: archivedFilters.year,
        };
        const res = await api.post("/warning/search", query);
        if (!res.ok) throw res;
        setArchivedByDays(
          res.data.reduce((acc, w) => {
            const date = new Date(w.createdAt);
            const day = `${DAYS[date.getDay()]} ${date.getDate()} ${MONTHS[date.getMonth()].toLowerCase()} ${date.getFullYear()}`;
            if (!acc[day]) acc[day] = [w];
            else acc[day].push(w);
            return acc;
          }, {}),
        );
      } catch (error) {
        captureError(error, { extra: { publisherId: publisher.id, filters: archivedFilters } });
      }
    };
    fetchData();
  }, [archivedFilters]);

  const buildDate = (date) => {
    const d = new Date(date);
    const minutes = d.getMinutes() < 10 ? `0${d.getMinutes()}` : d.getMinutes();
    return `${d.getDate()} ${MONTHS[d.getMonth()].toLowerCase()} ${d.getFullYear()} à ${d.getHours()}h${minutes}`;
  };

  if (!state) return <Loader />;
  return (
    <div className="flex flex-col">
      <div className="mb-10 flex flex-col gap-8">
        <h1 className="text-3xl font-bold">État du service</h1>

        <div className="flex items-center gap-8 bg-white p-6 shadow-sm">
          <img className="h-18 w-18" src={APILogo} alt="API Engagement" />
          <div>
            {!state.up ? (
              <p className="text-xl">
                <span aria-hidden="true">❌</span> L'API Engagement est rencontre quelques problèmes en ce moment
              </p>
            ) : !state.upToDate ? (
              <p className="text-xl">
                <span aria-hidden="true">❌</span> Dernier import réalisé il y a plus de 24h
              </p>
            ) : (
              <p className="text-xl">
                <span aria-hidden="true">✅</span> Récupération des missions opérationnelle
              </p>
            )}

            <p className="text-xl">
              <span aria-hidden="true">⏱️</span> Dernière mise à jour des flux réalisée le <b>{`${buildDate(state.last)}`}</b>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-6 bg-white p-6 shadow-sm">
          {currentWarnings.length > 1 ? (
            <>
              <div className="flex items-center justify-center">
                <span className="text-3xl" aria-hidden="true">
                  ❌
                </span>
              </div>
              <div className="flex flex-col gap-4">
                <p className="text-lg">
                  <b>Il semble y avoir un problème de paramétrages de votre côté.</b>
                  <br />
                  Consultez les alertes ci-dessous pour identifier le problème.
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-center">
                <span className="text-3xl" aria-hidden="true">
                  ✅
                </span>
              </div>
              <div className="flex flex-col gap-4">
                <h4 className="text-xl font-bold text-black">Votre compte est parfaitement opérationnel</h4>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="mb-4 flex flex-col">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Alertes en cours</h2>
          <a href="mailto:apiengagement@beta.gouv.fr" className="text-blue-france flex items-center border border-gray-900 py-2 pr-3 pl-4 text-sm">
            Contacter le support
            <RiMessage2Line className="ml-2" />
          </a>
        </div>
      </div>

      <div className="mb-14 flex flex-col gap-8">
        {Object.keys(currentWarningsByDays).length ? (
          Object.keys(currentWarningsByDays).map((d, i) => (
            <div key={i} className="flex flex-col gap-4">
              <h3 className="text-xl font-normal text-black">{d}</h3>
              {currentWarningsByDays[d].map((w, i) => {
                const label = WARNINGS[w.type] || WARNINGS.OTHER_WARNING;
                return (
                  <Link to={LINKS[w.type]} className="flex items-end gap-8 bg-white p-6 shadow-sm" key={i} id={slugify(`${w.type}-${w.publisherName}`)}>
                    <div className="flex items-center justify-center gap-8">
                      <div className="flex items-center justify-center">{label.emoji}</div>
                      <div className="flex flex-1 flex-col justify-between">
                        <div className="mb-3">
                          <span className="bgbg-[#FEECC2] textbg-[#716043] truncate rounded p-1 text-center text-xs font-semibold uppercase">{label.name}</span>
                        </div>
                        <p className="text-lg font-semibold">{w.title}</p>
                        <p className="mb-3 text-base">{label.advice}</p>
                      </div>
                    </div>
                    <div className="flex h-full flex-col">
                      <RiArrowRightLine className="text-blue-france text-2xl" />
                    </div>
                  </Link>
                );
              })}
            </div>
          ))
        ) : (
          <div className="flex items-center justify-center bg-white p-6 shadow-sm">
            <p className="text-xl font-semibold">Aucune alerte en cours</p>
          </div>
        )}
      </div>
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Historiques des alertes passées</h2>
        <div className="flex w-1/2 items-center justify-start gap-4">
          <Select
            options={Object.entries(WARNINGS).map(([k, v]) => ({ value: k, label: v.name }))}
            value={archivedFilters.type}
            onChange={(e) => setArchivedFilters({ ...archivedFilters, type: e.value })}
            placeholder="Type"
          />
          <Select
            options={MONTHS.map((e, i) => ({ value: i, label: e }))}
            value={archivedFilters.month}
            onChange={(e) => setArchivedFilters({ ...archivedFilters, month: e.value === "" ? undefined : e.value, year: archivedFilters.year || new Date().getFullYear() })}
            placeholder="Mois"
          />
          <Select
            options={YEARS.map((e) => ({ value: e, label: e }))}
            value={archivedFilters.year}
            onChange={(e) => setArchivedFilters({ ...archivedFilters, year: e.value === "" ? undefined : e.value })}
            placeholder="Année"
          />
        </div>
        {Object.values(archivedFilters).filter((v) => v).length !== 0 && (
          <div className="flex flex-wrap gap-3">
            <Badge label="Type" value={WARNINGS[archivedFilters.type]?.name} onDelete={() => setArchivedFilters({ ...archivedFilters, type: "" })} />
            <Badge label="Mois" value={MONTHS[archivedFilters.month]} onDelete={() => setArchivedFilters({ ...archivedFilters, month: undefined })} />
            <Badge label="Année" value={archivedFilters.year} onDelete={() => setArchivedFilters({ ...archivedFilters, year: undefined })} />
          </div>
        )}

        <div className="flex flex-col gap-8">
          {Object.keys(archivedWarningsByDays).length ? (
            Object.keys(archivedWarningsByDays).map((d, i) => (
              <div key={i} className="flex flex-col gap-4">
                <h3 className="mt-2 text-xl font-normal text-black">{d}</h3>
                {archivedWarningsByDays[d].map((w, i) => {
                  const label = WARNINGS[w.type] || WARNINGS.OTHER_WARNING;
                  return (
                    <div className="flex items-center gap-8 bg-white p-6 shadow-sm" key={i} id={slugify(`${w.type}-${w.publisherName}`)}>
                      <div className="flex items-center justify-center">{label.emoji}</div>
                      <div className="flex flex-1 flex-col justify-between">
                        <div className="mb-3">
                          <span className="bgbg-[#FEECC2] textbg-[#716043] truncate rounded p-1 text-center text-xs font-semibold uppercase">{label.name}</span>
                        </div>
                        <p className="text-lg font-semibold">{w.title}</p>
                        <p className="mb-3 text-base">{label.advice}</p>
                        {w.fixed && (
                          <div className="mt-3 flex items-center">
                            <RiCheckboxCircleFill className="text-green-success mr-2 w-4" />
                            <p className="text-gray-dar text-sm">
                              Corrigée le {new Date(w.fixedAt || w.updatedAt).getDate()} {MONTHS[new Date(w.fixedAt || w.updatedAt).getMonth()].toLowerCase()}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))
          ) : (
            <div className="flex items-center justify-center bg-white p-6 shadow-sm">
              <p className="text-xl font-semibold">Aucune alerte en passées</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const Badge = ({ label, value, onDelete }) => {
  if (!value) return null;
  return (
    <div className="bg-blue-france-975 flex items-center gap-2 rounded p-2">
      <p className="text-sm">{label}:</p>
      <p className="text-sm">{value}</p>
      <button className="text-sm text-black" onClick={onDelete}>
        <RiCloseFill />
      </button>
    </div>
  );
};

export default List;
