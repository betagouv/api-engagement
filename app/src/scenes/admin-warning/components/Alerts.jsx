import { useEffect, useMemo, useState } from "react";
import { RiArrowRightSLine } from "react-icons/ri";
import { Link, useSearchParams } from "react-router-dom";

import Avatar from "@/components/Avatar";
import Select from "@/components/Select";
import Table from "@/components/Table";
import { WARNING_STATUS, WARNINGS } from "@/constants";
import api from "@/services/api";
import { captureError } from "@/services/error";
import useStore from "@/services/store";

const PAGE_SIZE = 20;
const HEADER = [
  { title: "Partenaire" },
  { title: "Alerte" },
  { title: "Assignés" },
  { title: "Notifiée" },
  { title: "Statut" },
  { title: <span className="sr-only">Détail</span> },
];

const UNASSIGNED = "none";
const STATUS_OPTIONS = [
  { value: "TODO", label: "À traiter" },
  { value: "IN_PROGRESS", label: "En cours" },
  { value: "RESOLVED", label: "Résolue" },
  { value: "IGNORED", label: "Ignorée" },
];
const TYPE_OPTIONS = Object.entries(WARNINGS).map(([value, { name }]) => ({ value, label: name }));
const fullName = (u) => [u.firstname, u.lastname].filter(Boolean).join(" ") || u.email;

const Field = ({ label, children }) => (
  <div className="flex min-w-48 flex-1 flex-col gap-1">
    <span className="text-sm font-semibold">{label}</span>
    {children}
  </div>
);

export const formatDateTime = (date) => new Date(date).toLocaleString("fr", { dateStyle: "long", timeStyle: "short" });

const RELATIVE_UNITS = [
  ["year", 365 * 24 * 3600],
  ["month", 30 * 24 * 3600],
  ["day", 24 * 3600],
  ["hour", 3600],
  ["minute", 60],
];
const rtf = new Intl.RelativeTimeFormat("fr", { numeric: "auto" });

const formatRelative = (date) => {
  const seconds = (new Date(date).getTime() - Date.now()) / 1000;
  const [unit, size] = RELATIVE_UNITS.find(([, size]) => Math.abs(seconds) >= size) || ["minute", 60];
  return rtf.format(Math.round(seconds / size), unit);
};

export const StatusBadge = ({ status }) => {
  const { name, className } = WARNING_STATUS[status] || WARNING_STATUS.TODO;
  return <span className={`${className} rounded px-2 py-1 text-xs font-semibold whitespace-nowrap uppercase`}>{name}</span>;
};

const Alerts = () => {
  const { user } = useStore();
  const [searchParams, setSearchParams] = useSearchParams();
  // Filtres portés par l'URL : paramètre absent = valeur par défaut, paramètre vide (`?status=`) = « Tous ».
  const filters = useMemo(() => {
    const get = (key, fallback) => searchParams.get(key) ?? fallback;
    return { assignee: get("assignee", user?.id || ""), status: get("status", "TODO"), type: get("type", ""), publisherId: get("publisher", "") };
  }, [searchParams, user?.id]);
  const page = Number(searchParams.get("page")) || 1;
  const [admins, setAdmins] = useState([]);
  const [publishers, setPublishers] = useState([]);
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const [resU, resP] = await Promise.all([api.post("/user/search", { role: "admin" }), api.post("/publisher/search")]);
        if (!resU.ok) throw resU;
        if (!resP.ok) throw resP;
        setAdmins(resU.data);
        setPublishers(resP.data);
      } catch (error) {
        captureError(error);
      }
    };
    fetchOptions();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await api.post("/warning/search", {
          status: filters.status || undefined,
          type: filters.type || undefined,
          publisherId: filters.publisherId || undefined,
          assigneeId: filters.assignee && filters.assignee !== UNASSIGNED ? filters.assignee : undefined,
          unassigned: filters.assignee === UNASSIGNED || undefined,
          page,
          size: PAGE_SIZE,
        });
        if (!res.ok) throw res;
        setData(res.data);
        setTotal(res.total);
      } catch (error) {
        captureError(error, { extra: { filters, page } });
      }
      setLoading(false);
    };
    fetchData();
  }, [filters, page]);

  const assigneeOptions = useMemo(() => [{ value: UNASSIGNED, label: "Non assignée(s)" }, ...admins.map((a) => ({ value: a.id, label: fullName(a) }))], [admins]);
  const publisherOptions = useMemo(() => publishers.map((p) => ({ value: p.id, label: p.name })).sort((a, b) => a.label.localeCompare(b.label, "fr")), [publishers]);

  const update = (changes) =>
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        Object.entries(changes).forEach(([key, value]) => (value === null ? next.delete(key) : next.set(key, value)));
        return next;
      },
      { replace: true },
    );
  const setFilter = (key) => (option) => update({ [key]: option.value, page: null });
  const setPage = (value) => update({ page: value === 1 ? null : String(value) });
  const reset = () => update({ assignee: "", status: "", type: "", publisher: "", page: null });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-4" role="group" aria-label="Filtres des alertes">
        <Field label="Assigné à">
          <Select options={assigneeOptions} value={filters.assignee} placeholder="Tous" onChange={setFilter("assignee")} />
        </Field>
        <Field label="Statut">
          <Select options={STATUS_OPTIONS} value={filters.status} placeholder="Tous" onChange={setFilter("status")} />
        </Field>
        <Field label="Type d’alerte">
          <Select options={TYPE_OPTIONS} value={filters.type} placeholder="Tous" onChange={setFilter("type")} />
        </Field>
        <Field label="Partenaire">
          <Select options={publisherOptions} value={filters.publisherId} placeholder="Tous" onChange={setFilter("publisher")} />
        </Field>
        <button type="button" className="tertiary-bis-btn" onClick={reset}>
          Tout réinitialiser
        </button>
      </div>
      <p className="text-sm font-semibold" role="status">
        {loading ? "Chargement…" : `${total} alerte${total > 1 ? "s" : ""}`}
      </p>
      <Table caption="Liste des alertes" header={HEADER} pagination page={page} pageSize={PAGE_SIZE} onPageChange={setPage} total={total} loading={loading}>
        {data.map((w, i) => (
          <tr key={w.id} className={`${i % 2 === 0 ? "bg-table-even" : "bg-table-odd"} relative table-row hover:bg-gray-950`}>
            <td className="p-4">
              <div className="flex items-center gap-3">
                {w.publisherLogo ? (
                  <img className="h-10 w-16 shrink-0 object-contain" src={w.publisherLogo} alt="" aria-hidden="true" />
                ) : (
                  <div className="bg-grey-200 h-10 w-16 shrink-0" />
                )}
                <span className="text-sm font-semibold">{w.publisherName}</span>
              </div>
            </td>
            <td className="space-y-1 p-4">
              <Link className="link text-base font-bold after:absolute after:inset-0 after:content-['']" to={`/admin-warning/alerts/${w.id}`}>
                {w.title || (WARNINGS[w.type] || WARNINGS.OTHER_WARNING).name}
              </Link>
              <p className="text-xs">
                {(WARNINGS[w.type] || WARNINGS.OTHER_WARNING).name}
                {w.itemLabel ? ` · ${w.itemLabel}` : ""} · {w.occurrences} occurrence{w.occurrences > 1 ? "s" : ""}
              </p>
            </td>
            <td className="p-4">
              {w.assignees.length ? (
                <ul className="flex items-center gap-2">
                  {w.assignees.map((a) => (
                    <li key={a.id} className="flex items-center gap-2 text-sm">
                      <Avatar user={a} />
                      {a.firstname} {a.lastname}
                    </li>
                  ))}
                </ul>
              ) : (
                <span className="text-text-mention text-sm">Non assignée</span>
              )}
            </td>
            <td className="p-4 text-sm whitespace-nowrap">
              {w.notifiedAt ? (
                <time dateTime={w.notifiedAt} title={formatDateTime(w.notifiedAt)}>
                  {formatRelative(w.notifiedAt)}
                </time>
              ) : (
                <span className="text-text-mention">Non notifiée</span>
              )}
            </td>
            <td className="p-4">
              <StatusBadge status={w.status} />
            </td>
            <td className="text-blue-france p-4">
              <RiArrowRightSLine className="text-2xl" aria-hidden="true" />
            </td>
          </tr>
        ))}
      </Table>
    </div>
  );
};

export default Alerts;
