import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { DateInput } from "@/components/DateRangePicker";
import { METABASE_CARD_ID, MISSION_TYPE_OPTIONS } from "@/constants";
import AnalyticsCard from "@/scenes/performance/AnalyticsCard";
import api from "@/services/api";
import { captureError } from "@/services/error";
import useStore from "@/services/store";
import { withLegacyPublishers } from "@/utils/publisher";

const Announcer = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState({
    from: searchParams.has("from") ? new Date(searchParams.get("from")) : new Date(new Date().getFullYear() - 1, new Date().getMonth(), new Date().getDate()),
    to: searchParams.has("to") ? new Date(searchParams.get("to")) : new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate() + 1, 0, 0, 0, -1),
    type: searchParams.get("type") || "",
    publisher: searchParams.get("announcer") || "",
  });
  const [tableSettings, setTableSettings] = useState({ page: 1, sortBy: "" });
  const [partners, setPartners] = useState([]);
  const { user } = useStore();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const fetchPartners = async () => {
      if (!user) return;

      try {
        const query = user.role === "admin" ? { role: "annonceur" } : { role: "annonceur", ids: user.publishers };
        const res = await api.post("/publisher/search", query);
        if (!res.ok) {
          throw res;
        }

        const options = withLegacyPublishers(res.data)
          .filter((publisher) => publisher?.id || publisher?._id)
          .sort((a, b) => (a.name || "").localeCompare(b.name || ""))
          .map((publisher) => ({
            value: String(publisher.id || publisher._id),
            label: publisher.name || "Partenaire inconnu",
          }));

        setPartners(options);
      } catch (error) {
        captureError(error, { extra: { userRole: user.role, userPublishers: user.publishers } });
      }
    };

    fetchPartners();
  }, [user]);

  useEffect(() => {
    const query = new URLSearchParams();
    if (filters.from) query.set("from", filters.from.toISOString());
    if (filters.to) query.set("to", filters.to.toISOString());
    if (filters.type) query.set("type", filters.type);
    if (filters.publisher) query.set("announcer", filters.publisher);
    setSearchParams(query);
  }, [filters, setSearchParams]);

  useEffect(() => {
    setTableSettings((prev) => ({ ...prev, page: 1 }));
  }, [filters]);

  const formatTableCell = (value, column) => {
    const columnKey = (column?.key || column?.name || "").toLowerCase();
    const isConversionRate = columnKey.includes("taux") || columnKey.includes("conversion");

    if (!isConversionRate) {
      return value;
    }

    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) {
      return value;
    }

    const percentValue = numericValue <= 1 ? numericValue * 100 : numericValue;
    return `${percentValue.toLocaleString("fr", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} %`;
  };

  return (
    <div className="space-y-12 p-12">
      <title>Annonceurs - Statistiques - Administration - API Engagement</title>
      <div className="flex justify-between">
        <h2 className="text-2xl font-bold">Annonceurs</h2>
      </div>
      <div className="box-border flex">
        <div className="flex w-full justify-between gap-2">
          <DateInput value={{ from: filters.from, to: filters.to }} onChange={(v) => setFilters({ ...filters, from: v.from, to: v.to })} />
          <label htmlFor="announcer" className="sr-only">
            Partenaire annonceur
          </label>
          <select id="announcer" className="select min-w-[27.5em]" value={filters.publisher} onChange={(e) => setFilters({ ...filters, publisher: e.target.value })}>
            <option value="">Partenaires</option>
            {partners.map((partner) => (
              <option key={partner.value} value={partner.value}>
                {partner.label}
              </option>
            ))}
          </select>
          <label htmlFor="mission-type" className="sr-only">
            Type de mission
          </label>
          <select id="mission-type" className="select min-w-[27.5em]" value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value })}>
            <option value="">Type de mission</option>
            {MISSION_TYPE_OPTIONS.map((missionType) => (
              <option key={missionType.value} value={missionType.value}>
                {missionType.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <AnalyticsCard
        cardId={METABASE_CARD_ID.ADMIN_STATS_PARTNERS_TABLE}
        type="table"
        filters={filters}
        variables={{
          role: "annonceur",
          ...(filters.publisher ? { publisher_id: filters.publisher } : {}),
          ...(filters.type ? { mission_type: filters.type } : {}),
        }}
        tableProps={{
          page: tableSettings.page,
          pageSize: 20,
          sortBy: tableSettings.sortBy,
          onPageChange: (page) => setTableSettings((prev) => ({ ...prev, page })),
          onSort: (key) =>
            setTableSettings((prev) => ({
              ...prev,
              page: 1,
              sortBy: prev.sortBy === key ? `-${key}` : key,
            })),
        }}
        formatCell={formatTableCell}
      />
    </div>
  );
};

export default Announcer;
