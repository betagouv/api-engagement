import { useEffect, useState } from "react";
import { RiCheckboxCircleFill, RiCloseFill } from "react-icons/ri";

import APILogo from "../../assets/svg/logo.svg";
import Loader from "../../components/Loader";
import Select from "../../components/NewSelect";
import { DAYS, MONTHS, WARNINGS, YEARS } from "../../constants";
import api from "../../services/api";
import { captureError } from "../../services/error";
import { slugify } from "../../services/utils";
import { withLegacyPublishers } from "../../utils/publisher";
import Bots from "./components/Bots";

const Index = () => {
  const [currentWarnings, setCurrentWarnings] = useState([]);
  const [currentFilters, setCurrentFilters] = useState({
    publisher: "",
    type: "",
    month: undefined,
    year: undefined,
  });
  const [archivedFilters, setArchivedFilters] = useState({
    publisher: "",
    type: "",
    month: undefined,
    year: undefined,
  });
  const [currentWarningsByDays, setCurrentByDays] = useState({});
  const [currentWarningsByPublishers, setCurrentByPublishers] = useState({});
  const [archivedWarningsByDays, setArchivedByDays] = useState({});
  const [loading, setLoading] = useState(true);

  const [state, setState] = useState();
  const [publishers, setPublishers] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const resP = await api.post("/publisher/search");
        if (!resP.ok) throw resP;
        setPublishers(withLegacyPublishers(resP.data));

        const resS = await api.get("/warning/admin-state");
        if (!resS.ok) throw resS;
        setState(resS.data);

        const resW = await api.post("/warning/search", { fixed: false });
        if (!resW.ok) throw resW;
        setCurrentWarnings(resW.data);
        setCurrentByPublishers(
          resW.data.reduce((acc, w) => {
            if (!acc[w.publisherId]) acc[w.publisherId] = { name: w.publisherName, logo: w.publisherLogo, warnings: [WARNINGS[w.type].name] };
            else acc[w.publisherId].warnings.push(WARNINGS[w.type].name);
            return acc;
          }, {}),
        );
        setCurrentByDays(
          resW.data.reduce((acc, w) => {
            const date = new Date(w.createdAt);
            const day = `${DAYS[date.getDay()]} ${date.getDate()} ${MONTHS[date.getMonth()].toLowerCase()} ${date.getFullYear()}`;
            if (!acc[day]) acc[day] = [w];
            else acc[day].push(w);
            return acc;
          }, {}),
        );
      } catch (error) {
        captureError(error);
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (!currentWarnings) return;
    let filteredWarnings = currentWarnings;
    if (currentFilters.publisher) filteredWarnings = filteredWarnings.filter((w) => w.publisherId === currentFilters.publisher);
    if (currentFilters.type) filteredWarnings = filteredWarnings.filter((w) => w.type === currentFilters.type);
    if (currentFilters.month) filteredWarnings = filteredWarnings.filter((w) => new Date(w.createdAt).getMonth() === currentFilters.month);
    if (currentFilters.year) filteredWarnings = filteredWarnings.filter((w) => new Date(w.createdAt).getFullYear() === currentFilters.year);
    setCurrentByDays(
      filteredWarnings.reduce((acc, w) => {
        const date = new Date(w.createdAt);
        const day = `${DAYS[date.getDay() - 1]} ${date.getDate()} ${MONTHS[date.getMonth()].toLowerCase()} ${date.getFullYear()}`;
        if (!acc[day]) acc[day] = [w];
        else acc[day].push(w);
        return acc;
      }, {}),
    );
  }, [currentFilters]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const query = {
          fixed: "true",
          publisherId: archivedFilters.publisher,
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
        captureError(error, { extra: { filters: archivedFilters } });
      }
    };
    fetchData();
  }, [archivedFilters]);

  const buildDate = (date) => {
    const d = new Date(date);
    const minutes = d.getMinutes() < 10 ? `0${d.getMinutes()}` : d.getMinutes();
    return `${d.getDate()} ${MONTHS[d.getMonth()].toLowerCase()} ${d.getFullYear()} à ${d.getHours()}h${minutes}`;
  };

  if (loading)
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader />
      </div>
    );

  return (
    <div className="space-y-12">
      <title>API Engagement - Alertes - Administration</title>
      <div className="space-y-10">
        <h1 className="text-4xl font-bold">État du service</h1>

        <div className="flex items-center gap-8 bg-white p-6 shadow-sm">
          <img className="h-18 w-18" src={APILogo} alt="API Engagement" />
          <div>
            {state.success / state.imports < 0.9 ? (
              <p className="text-xl font-bold">
                <span aria-hidden="true">❌</span> {Math.round(((state.imports - state.success) * 100) / state.imports)}% des imports ont généré une erreur
              </p>
            ) : new Date(state.last) < new Date(Date.now() - 1000 * 60 * 60 * 4) ? (
              <p className="text-xl font-bold">
                <span aria-hidden="true">❌</span> Un import n'a pas été réalisé, le dernier date de plus de 4h
              </p>
            ) : (
              <p className="text-xl font-bold">
                <span aria-hidden="true">✅</span> Récupération des missions opérationnelle
              </p>
            )}
            <p className="text-xl">Dernière mise à jour des flux réalisée le {`${buildDate(state.last)}`}</p>
          </div>
        </div>
        <div className="space-y-12 bg-white p-12 shadow-lg">
          <h4 className="mb-6 text-xl font-bold text-black">
            {Object.keys(currentWarningsByPublishers).length > 1
              ? `${Object.keys(currentWarningsByPublishers).length} partenaires rencontrent un problème`
              : `${Object.keys(currentWarningsByPublishers).length} partenaire rencontre un problème`}
          </h4>
          <div className="grid grid-cols-4 gap-10">
            {Object.values(currentWarningsByPublishers).map((p, i) => (
              <div className="border-grey-border flex h-40 flex-col items-center border" key={i}>
                <div className="text-text-mention mt-2 text-center text-xs">{p.name}</div>
                <div className="flex h-24 items-center justify-center">
                  {p.logo ? <img className="h-20 w-4/5 object-contain" src={p.logo} alt={p.name} /> : <div className="h-20 w-4/5 bg-gray-200" />}
                </div>

                <div className="border-grey-border flex h-12 w-full items-center justify-center gap-2 border-t px-3">
                  <span className="bg-yellow-tournesol-950 text-yellow-tournesol-200 truncate rounded p-1 text-center text-xs font-semibold uppercase">{p.warnings[0]}</span>
                  {p.warnings.length > 1 && (
                    <span className="bg-yellow-tournesol-950 text-yellow-tournesol-200 rounded p-1 text-center text-xs font-semibold whitespace-nowrap uppercase">
                      + {p.warnings.length - 1}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <Bots />
      <div className="mb-6 space-y-6">
        <h2 className="text-2xl font-bold">Alertes en cours</h2>
        <div className="flex w-2/3 items-center justify-start gap-4">
          <Select
            options={publishers.map((e) => ({ value: e.id, label: e.name }))}
            value={currentFilters.publisher}
            onChange={(e) => setCurrentFilters({ ...currentFilters, publisher: e.value })}
            placeholder="Partenaire"
          />
          <Select
            options={Object.entries(WARNINGS).map(([k, v]) => ({ value: k, label: v.name }))}
            value={currentFilters.type}
            onChange={(e) => setCurrentFilters({ ...currentFilters, type: e.value })}
            placeholder="Type"
          />
          <Select
            options={MONTHS.map((e, i) => ({ value: i, label: e }))}
            value={currentFilters.month}
            onChange={(e) => setCurrentFilters({ ...currentFilters, month: e.value === "" ? undefined : e.value, year: currentFilters.year || new Date().getFullYear() })}
            placeholder="Mois"
          />
          <Select
            options={YEARS.map((e) => ({ value: e, label: e }))}
            value={currentFilters.year}
            onChange={(e) => setCurrentFilters({ ...currentFilters, year: e.value === "" ? undefined : e.value })}
            placeholder="Année"
          />
        </div>
        {Object.values(currentFilters).filter((v) => v).length !== 0 && (
          <div className="flex flex-wrap gap-3">
            <Badge
              label="Partenaire"
              value={publishers.find((p) => p.id === currentFilters.publisher)?.name}
              onDelete={() => setCurrentFilters({ ...currentFilters, publisher: "" })}
            />
            <Badge label="Type" value={WARNINGS[currentFilters.type]?.name} onDelete={() => setCurrentFilters({ ...currentFilters, type: "" })} />
            <Badge label="Mois" value={MONTHS[currentFilters.month]} onDelete={() => setCurrentFilters({ ...currentFilters, month: undefined })} />
            <Badge label="Année" value={currentFilters.year} onDelete={() => setCurrentFilters({ ...currentFilters, year: undefined })} />
          </div>
        )}

        <div className="flex flex-col gap-8">
          {Object.keys(currentWarningsByDays).length ? (
            Object.keys(currentWarningsByDays).map((d, i) => (
              <div key={i} className="flex flex-col gap-4">
                <h3 className="mt-4 text-2xl font-normal text-black">{d}</h3>
                {currentWarningsByDays[d].map((w, i) => {
                  const label = WARNINGS[w.type] || WARNINGS.OTHER_WARNING;
                  return (
                    <div className="flex items-center gap-8 bg-white p-6 shadow-sm" key={i} id={slugify(`${w.type}-${w.publisherName}`)}>
                      {w.publisherLogo ? <img className="h-20 w-36 object-contain" src={w.publisherLogo} alt={w.publisherName} /> : <div className="h-20 w-36 bg-gray-200" />}
                      <div className="flex flex-col justify-between">
                        <div className="mb-2">
                          <span className="bg-yellow-tournesol-950 text-yellow-tournesol-200 truncate rounded p-1 text-center text-xs font-semibold uppercase">{label.name}</span>
                        </div>
                        <p className="text-xl font-semibold">{w.title}</p>
                      </div>
                    </div>
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
      </div>
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Historiques des alertes passées</h2>
        <div className="flex w-2/3 items-center justify-start gap-4">
          <Select
            options={publishers.map((e) => ({ value: e.id, label: e.name }))}
            value={archivedFilters.publisher}
            onChange={(e) => setArchivedFilters({ ...archivedFilters, publisher: e.value })}
            placeholder="Partenaire"
          />
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
            <Badge
              label="Partenaire"
              value={publishers.find((p) => p.id === archivedFilters.publisher)?.name}
              onDelete={() => setArchivedFilters({ ...archivedFilters, publisher: "" })}
            />
            <Badge label="Type" value={WARNINGS[archivedFilters.type]?.name} onDelete={() => setArchivedFilters({ ...archivedFilters, type: "" })} />
            <Badge label="Mois" value={MONTHS[archivedFilters.month]} onDelete={() => setArchivedFilters({ ...archivedFilters, month: undefined })} />
            <Badge label="Année" value={archivedFilters.year} onDelete={() => setArchivedFilters({ ...archivedFilters, year: undefined })} />
          </div>
        )}

        <div className="flex flex-col gap-8">
          {Object.keys(archivedWarningsByDays).length ? (
            Object.keys(archivedWarningsByDays).map((d, i) => (
              <div key={i} className="flex flex-col gap-4">
                <h3 className="mt-4 text-2xl font-normal text-black">{d}</h3>
                {archivedWarningsByDays[d].map((w, i) => {
                  const label = WARNINGS[w.type] || WARNINGS.OTHER_WARNING;
                  return (
                    <div className="flex items-center gap-8 bg-white p-6 shadow-sm" key={i}>
                      {w.publisherLogo ? <img className="h-20 w-36 object-contain" src={w.publisherLogo} alt={w.publisherName} /> : <div className="h-20 w-36 bg-gray-200" />}

                      <div className="flex flex-col justify-between">
                        <div className="mb-2">
                          <span className="bg-yellow-tournesol-950 text-yellow-tournesol-200 truncate rounded p-1 text-center text-xs font-semibold uppercase">{label.name}</span>
                        </div>
                        <p className="text-xl font-semibold">{w.title}</p>
                        {w.fixed && (
                          <div className="mt-3 flex items-center">
                            <RiCheckboxCircleFill className="text-success mr-2 w-4" />
                            <p className="text-text-mention">
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
              <p className="text-xl font-semibold">Aucune alerte passée</p>
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

export default Index;
