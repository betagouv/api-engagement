import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import Avatar from "@/components/Avatar";
import Table from "@/components/Table";
import { WARNING_STATUS, WARNINGS } from "@/constants";
import api from "@/services/api";
import { captureError } from "@/services/error";

const PAGE_SIZE = 20;
const HEADER = [{ title: "Partenaire" }, { title: "Alerte" }, { title: "Assignés" }, { title: "Notifiée" }, { title: "Statut" }];

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
  const [resolved, setResolved] = useState(false);
  const [page, setPage] = useState(1);
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await api.post("/warning/search", { fixed: resolved, page, size: PAGE_SIZE });
        if (!res.ok) throw res;
        setData(res.data);
        setTotal(res.total);
      } catch (error) {
        captureError(error, { extra: { resolved, page } });
      }
      setLoading(false);
    };
    fetchData();
  }, [resolved, page]);

  const select = (value) => {
    setResolved(value);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-2" role="group" aria-label="Statut des alertes">
        {[
          { label: "Ouvertes", value: false },
          { label: "Résolues", value: true },
        ].map((o) => (
          <button
            key={o.label}
            type="button"
            aria-pressed={resolved === o.value}
            onClick={() => select(o.value)}
            className={resolved === o.value ? "primary-btn" : "secondary-btn"}
          >
            {o.label}
          </button>
        ))}
      </div>
      <Table caption="Liste des alertes" header={HEADER} pagination page={page} pageSize={PAGE_SIZE} onPageChange={setPage} total={total} loading={loading}>
        {data.map((w, i) => (
          <tr key={w.id} className={`${i % 2 === 0 ? "bg-table-even" : "bg-table-odd"} table-row`}>
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
              <Link className="link text-base font-bold" to={`/admin-warning/alerts/${w.id}`}>
                {w.title || (WARNINGS[w.type] || WARNINGS.OTHER_WARNING).name}
              </Link>
              <p className="text-xs">
                {(WARNINGS[w.type] || WARNINGS.OTHER_WARNING).name} · {w.occurrences} occurrence{w.occurrences > 1 ? "s" : ""}
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
          </tr>
        ))}
      </Table>
    </div>
  );
};

export default Alerts;
