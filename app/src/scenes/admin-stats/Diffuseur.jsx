import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { DateInput } from "@/components/DateRangePicker";
import { METABASE_CARD_ID, MISSION_TYPE_OPTIONS } from "@/constants";
import AnalyticsCard from "@/scenes/performance/AnalyticsCard";
import api from "@/services/api";
import { captureError } from "@/services/error";
import useStore from "@/services/store";
import { withLegacyPublishers } from "@/utils/publisher";

const Diffuseur = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState({
    from: searchParams.has("from") ? new Date(searchParams.get("from")) : new Date(new Date().getFullYear() - 1, new Date().getMonth(), new Date().getDate()),
    to: searchParams.has("to") ? new Date(searchParams.get("to")) : new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate(), 0, 0, 0, -1),
    type: searchParams.get("type") || "",
    publisher: searchParams.get("broadcaster") || "",
    source: searchParams.get("source") || "",
  });
  const [tableSettings, setTableSettings] = useState({ page: 1, sortBy: "" });
  const [partners, setPartners] = useState([]);
  const { user } = useStore();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const fetchPartners = async () => {
      if (!user) {
        return;
      }

      try {
        const query = user.role === "admin" ? { role: "diffuseur" } : { role: "diffuseur", ids: user.publishers };
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
    if (filters.from) {
      query.set("from", filters.from.toISOString());
    }
    if (filters.to) {
      query.set("to", filters.to.toISOString());
    }
    if (filters.type) {
      query.set("type", filters.type);
    }
    if (filters.source) {
      query.set("source", filters.source);
    }
    if (filters.publisher) {
      query.set("broadcaster", filters.publisher);
    }
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
    <div className="space-y-12 p-4 sm:p-12">
      <title>Diffuseurs - Statistiques - Administration - API Engagement</title>
      <div className="flex justify-between">
        <h2 className="text-2xl font-bold">Diffuseurs</h2>
      </div>
      <div className="box-border flex bg-white">
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-between">
          <DateInput value={{ from: filters.from, to: filters.to }} onChange={(v) => setFilters({ ...filters, from: v.from, to: v.to })} />
          <label htmlFor="broadcaster" className="sr-only">
            Partenaire diffuseur
          </label>
          <select id="broadcaster" className="select w-full sm:w-[18em]" value={filters.publisher} onChange={(e) => setFilters({ ...filters, publisher: e.target.value })}>
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
          <select className="select w-full sm:w-[18em]" id="mission-type" value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value })}>
            <option className="text-sm" value="">
              Type de mission
            </option>
            {MISSION_TYPE_OPTIONS.map((missionType) => (
              <option key={missionType.value} value={missionType.value}>
                {missionType.label}
              </option>
            ))}
          </select>
          <label htmlFor="source" className="sr-only">
            Moyen de diffusion
          </label>
          <select className="select w-full sm:w-[18em]" id="source" value={filters.source} onChange={(e) => setFilters({ ...filters, source: e.target.value })}>
            <option className="text-sm" value="">
              Moyen de diffusion
            </option>
            <option value="api">API</option>
            <option value="widget">Widget</option>
            <option value="campaign">Campagne</option>
          </select>
        </div>
      </div>
      <div className="overflow-x-auto">
        <div className="min-w-[600px]">
          <AnalyticsCard
            cardId={METABASE_CARD_ID.ADMIN_STATS_PARTNERS_TABLE}
            type="table"
            filters={filters}
            variables={{
              role: "diffuseur",
              ...(filters.publisher ? { publisher_id: filters.publisher } : {}),
              ...(filters.type ? { mission_type: filters.type } : {}),
              ...(filters.source ? { source: filters.source } : {}),
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
      </div>
    </div>
  );
};

export default Diffuseur;
