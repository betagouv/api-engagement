import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import ModerationAutoIcon from "../../../assets/svg/moderation-auto.svg";
import Loader from "../../../components/Loader";
import Table from "../../../components/Table";
import Toggle from "../../../components/Toggle";
import api from "../../../services/api";
import { captureError } from "../../../services/error";
import useStore from "../../../services/store";
import Filters from "./components/Filters";
import Header from "./components/Header";
import MissionItem from "./components/MissionItem";
import SettingsModal from "./components/SettingsModal";
import MissionModal from "./modal";

const Moderation = () => {
  const { publisher } = useStore();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    page: 1,
    size: 25,
    status: searchParams.get("status") || "",
    comment: searchParams.get("comment") || "",
    publisherId: searchParams.get("publisher") || "",
    organizationName: searchParams.get("organizationName") || "",
    department: searchParams.get("department") || "",
    city: searchParams.get("city") || "",
    activity: searchParams.get("activity") || "",
    domain: searchParams.get("domain") || "",
    search: searchParams.get("search") || "",
  });
  const [reloadFilters, setReloadFilters] = useState(false);
  const [data, setData] = useState([]);
  const [sort, setSort] = useState("");
  const [size, setSize] = useState(25);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState([]);
  const [history, setHistory] = useState();

  useEffect(() => {
    if (!publisher.moderator) {
      navigate("/broadcast");
    }
  }, [publisher, navigate]);

  useEffect(() => {
    fetchHistory();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const query = {
          moderatorId: publisher.id,
          status: filters.status,
          comment: filters.comment,
          publisherId: filters.publisherId,
          city: filters.city,
          domain: filters.domain,
          department: filters.department,
          organizationName: filters.organizationName,
          activity: filters.activity,
          search: filters.search,
          from: (filters.page - 1) * filters.size,
          size: size,
          sort: sort,
        };

        if (query.page > 1) query.from = (query.page - 1) * query.size;

        const resM = await api.post("/moderation/search", query);

        if (!resM.ok) throw resM;
        setData(resM.data);
        setTotal(resM.total);

        const newSearchParams = new URLSearchParams();
        if (filters.status) newSearchParams.set("status", filters.status);
        if (filters.comment) newSearchParams.set("comment", filters.comment);
        if (filters.publisherId) newSearchParams.set("publisher", filters.publisherId);
        if (filters.organizationName) newSearchParams.set("organizationName", filters.organizationName);
        if (filters.department) newSearchParams.set("department", filters.department);
        if (filters.city) newSearchParams.set("city", filters.city);
        if (filters.activity) newSearchParams.set("activity", filters.activity);
        if (filters.domain) newSearchParams.set("domain", filters.domain);
        if (filters.search) newSearchParams.set("search", filters.search);
        if (searchParams.has("mission")) newSearchParams.set("mission", searchParams.get("mission"));
        setSearchParams(newSearchParams);
      } catch (error) {
        captureError(error, { extra: { filters } });
      }
      setLoading(false);
    };
    fetchData();
  }, [filters, sort, size]);

  const fetchHistory = async () => {
    try {
      const res = await api.post("/moderation/search-history", { moderatorId: publisher.id });
      if (!res.ok) throw res;
      setHistory(res.data);
    } catch (error) {
      captureError(error, { extra: { publisherId: publisher.id } });
    }
  };

  const applyMissionUpdates = (updates) => {
    const list = Array.isArray(updates) ? updates : updates ? [updates] : [];
    if (!list.length) return;
    setData((prev) => {
      const map = new Map(list.filter((mission) => mission && mission._id).map((mission) => [mission._id, mission]));
      if (!map.size) return prev;
      return prev.map((mission) => {
        const updated = map.get(mission._id);
        return updated ? { ...mission, ...updated } : mission;
      });
    });
  };

  const handlePageChange = (page) => {
    setFilters({ ...filters, page });
    window.scrollTo({ top: 500, behavior: "smooth" });
  };

  const handleSelectAll = (e) => {
    const checked = e.target.checked;
    if (checked) setSelected(data.map((m) => m._id.toString()));
    else setSelected([]);
  };

  if (!history)
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader />
      </div>
    );

  return (
    <div className="space-y-12 py-12">
      <title>API Engagement - Modération - Diffuser des missions</title>
      <MissionModal
        onChange={(values) => {
          applyMissionUpdates(values);
          fetchHistory();
        }}
      />
      <div className="mx-12 flex items-start justify-between">
        <div className="flex items-center gap-4">
          <img src={ModerationAutoIcon} className="h-14 w-14" allt="Modération automatique" />
          <h2 className="text-xl font-semibold text-black">Modération automatique</h2>
        </div>

        <div className="pt-4">
          <div className="flex items-center gap-4">
            <Toggle aria-label="Activer la modération automatique" value={true} />
            <label className="ml-2 font-semibold">Activer la modération automatique</label>
          </div>
          <div className="flex items-center justify-end">
            <SettingsModal />
          </div>
        </div>
      </div>
      <div className="px-12">
        <div className="h-px w-full bg-gray-900" />
      </div>

      <Filters filters={filters} onChange={(next) => setFilters({ ...filters, ...next, page: 1 })} searchParams={searchParams} reload={reloadFilters} />
      <div className="px-12">
        <div className="h-px w-full bg-gray-900" />
      </div>
      <Header
        total={total}
        data={data}
        size={size}
        sort={sort}
        selected={selected}
        onSize={(s) => {
          setSize(s);
          setFilters({ ...filters, page: 1 });
        }}
        onSort={setSort}
        onSelect={setSelected}
        onChange={(values) => {
          applyMissionUpdates(values);
          setReloadFilters((prev) => !prev);
          fetchHistory();
        }}
      />

      <div className="mx-12">
        <Table
          header={[
            {
              title: (
                <div className="flex items-center">
                  <label className="flex w-14 items-center">
                    <span className="sr-only">Sélectionner toutes les missions</span>
                    <input
                      type="checkbox"
                      className="checkbox"
                      checked={selected.length === data.length && data.length > 0}
                      onChange={handleSelectAll}
                      ref={(el) => {
                        if (el) el.indeterminate = selected.length > 0 && selected.length < data.length;
                      }}
                    />
                  </label>
                  <h3 className="text-sm font-semibold">Mission</h3>
                </div>
              ),
              colSpan: 3,
            },
            { title: "Organisation" },
            { title: "Actions", colSpan: 2 },
          ]}
          total={total}
          loading={loading}
          page={filters.page}
          pageSize={size}
          onPageChange={handlePageChange}
        >
          {data.map((item, i) => (
            <tr key={i} className={`${i % 2 === 0 ? "bg-gray-975" : "bg-gray-1000-active"} table-item h-48`}>
              <MissionItem
                data={item}
                history={history.organization[item.organizationName] || { ACCEPTED: 0, REFUSED: 0 }}
                selected={selected.includes(item.id)}
                onChange={(values) => {
                  applyMissionUpdates(values);
                  fetchHistory();
                  setReloadFilters((prev) => !prev);
                }}
                onChangeMany={(values) => {
                  setData(
                    data.map((d) => {
                      const changed = values.find((v) => v.id === d.id);
                      if (changed) return { ...d, ...changed };
                      return d;
                    }),
                  );
                  fetchHistory();
                  setReloadFilters(!reloadFilters);
                }}
                onSelect={() => setSelected(selected.includes(item.id) ? selected.filter((id) => id !== item.id) : [...selected, item.id])}
                onFilter={(v) => setFilters({ ...filters, organizationName: v, page: 1 })}
              />
            </tr>
          ))}
        </Table>
      </div>
    </div>
  );
};

export default Moderation;
