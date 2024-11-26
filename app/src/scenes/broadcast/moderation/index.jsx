import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate, useSearchParams } from "react-router-dom";

import ModerationAutoIcon from "../../../assets/svg/moderation-auto.svg";
import Loader from "../../../components/Loader";
import { TablePaginator } from "../../../components/Table";
import Toggle from "../../../components/Toggle";
import api from "../../../services/api";
import { captureError } from "../../../services/error";
import useStore from "../../../services/store";
import Filters from "./components/Filters";
import Header from "./components/Header";
import MissionItem from "./components/MissionItem";
import MissionModal from "./components/MissionModal";
import SettingsModal from "./components/SettingsModal";

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
    publisher: searchParams.get("publisher") || "",
    organization: searchParams.get("organization") || "",
    department: searchParams.get("department") || "",
    city: searchParams.get("city") || "",
    activity: searchParams.get("activity") || "",
    domain: searchParams.get("domain") || "",
    search: searchParams.get("search") || "",
  });
  const [options, setOptions] = useState({
    status: [],
    comments: [],
    publishers: [],
    activities: [],
    domains: [],
    departments: [],
    organizations: [],
    cities: [],
  });
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
    const timeout = setTimeout(() => {
      fetchData();
    }, 300);
    return () => clearTimeout(timeout);
  }, [filters, sort, size]);

  const fetchHistory = async () => {
    try {
      const res = await api.post("/moderation/search-history", { moderatorId: publisher._id });
      if (!res.ok) throw res;
      setHistory(res.data);
    } catch (error) {
      captureError(error, "Une erreur est survenue");
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const query = {
        moderatorId: publisher._id,
        status: filters.status,
        comment: filters.comment,
        publisher: filters.publisher,
        city: filters.city,
        domain: filters.domain,
        department: filters.department,
        organization: filters.organization,
        activity: filters.activity,
        search: filters.search,
        from: (filters.page - 1) * filters.size,
        size: size,
        sort: sort,
      };

      if (query.page > 1) query.from = (query.page - 1) * query.size;

      const res = await api.post("/moderation/search", query);

      if (!res.ok) throw res;
      setData(res.data);
      setTotal(res.total);
      setOptions(res.aggs);

      const newSearchParams = new URLSearchParams();
      if (filters.status) newSearchParams.set("status", filters.status);
      if (filters.comment) newSearchParams.set("comment", filters.comment);
      if (filters.publisher) newSearchParams.set("publisher", filters.publisher);
      if (filters.organization) newSearchParams.set("organization", filters.organization);
      if (filters.department) newSearchParams.set("department", filters.department);
      if (filters.city) newSearchParams.set("city", filters.city);
      if (filters.activity) newSearchParams.set("activity", filters.activity);
      if (filters.domain) newSearchParams.set("domain", filters.domain);
      if (filters.search) newSearchParams.set("search", filters.search);
      if (searchParams.has("mission")) newSearchParams.set("mission", searchParams.get("mission"));
      setSearchParams(newSearchParams);
    } catch (error) {
      captureError(error, "Une erreur est survenue");
    }
    setLoading(false);
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
      <div className="flex justify-center items-center h-96">
        <Loader />
      </div>
    );

  return (
    <div className="space-y-12 py-12">
      <Helmet>
        <title>Modération - Diffuser des missions - API Engagement</title>
      </Helmet>
      <MissionModal
        onChange={() => {
          fetchData();
          fetchHistory();
        }}
      />
      <div className="flex items-start justify-between mx-12">
        <div className="flex items-center gap-4">
          <img src={ModerationAutoIcon} className="h-14 w-14" allt="Modération automatique" />
          <h2 className="text-xl font-semibold text-black">Modération automatique</h2>
        </div>

        <div className="pt-4">
          <div className="flex items-center gap-4">
            <Toggle checked={true} setChecked={() => null} />
            <label className="ml-2 font-semibold">Activer la modération automatique</label>
          </div>
          <div className="flex items-center justify-end">
            <SettingsModal />
          </div>
        </div>
      </div>
      <div className="px-12">
        <div className="h-px w-full bg-gray-border" />
      </div>

      <Filters filters={filters} onChange={setFilters} options={options} searchParams={searchParams} />
      <div className="px-12">
        <div className="h-px w-full bg-gray-border" />
      </div>
      <Header
        total={total}
        data={data}
        size={size}
        sort={sort}
        selected={selected}
        onSize={setSize}
        onSort={setSort}
        onSelect={setSelected}
        onChange={() => {
          fetchData();
          fetchHistory();
        }}
      />

      <div className="mx-12">
        <TablePaginator
          data={data}
          pageSize={size}
          length={total}
          loading={loading}
          onPageChange={handlePageChange}
          renderHeader={() => (
            <>
              <h4 className="flex w-[5%] items-center">
                <label htmlFor="moderation-select-all" className="sr-only">
                  Sélectionner toutes les missions
                </label>
                <input
                  id="moderation-select-all"
                  name="moderation-select-all"
                  type="checkbox"
                  className="checkbox"
                  checked={selected.length === data.length}
                  onChange={handleSelectAll}
                  ref={(el) => {
                    if (el) el.indeterminate = selected.length > 0 && selected.length < data.length;
                  }}
                />
              </h4>
              <h4 className="flex-1">Mission</h4>
              <h4 className="w-[25%]">Organisation</h4>
              <h4 className="w-[30%]">Actions</h4>
            </>
          )}
          itemHeight="h-48"
          itemBackground="bg-white"
          renderItem={(item) => (
            <>
              <MissionItem
                data={item}
                history={history.organization[item.organizationName] || { ACCEPTED: 0, REFUSED: 0 }}
                selected={selected.includes(item._id)}
                onChange={() => {
                  fetchData();
                  fetchHistory();
                }}
                onSelect={() => setSelected(selected.includes(item._id) ? selected.filter((id) => id !== item._id) : [...selected, item._id])}
                onFilter={(v) => setFilters({ ...filters, organization: v, page: 1 })}
              />
            </>
          )}
        />
      </div>
    </div>
  );
};

export default Moderation;
