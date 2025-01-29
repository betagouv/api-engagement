import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { RiCheckboxCircleFill, RiCloseCircleFill } from "react-icons/ri";
import { Link, useSearchParams } from "react-router-dom";

import SearchInput from "../../components/SearchInput";
import { TablePaginator } from "../../components/Table";
import api from "../../services/api";
import { captureError } from "../../services/error";

const List = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState({
    size: Number(searchParams.get("size")) || 25,
    from: Number(searchParams.get("from")) || 0,
    search: searchParams.get("search") || "",
    department: searchParams.get("department") || null,
    city: searchParams.get("city") || null,
  });

  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const query = {
          from: filters.from,
          size: filters.size,
        };
        if (filters.city) query.city = filters.city;
        if (filters.department) query.department = filters.department;
        if (filters.search) query.search = filters.search;
        setSearchParams(new URLSearchParams(query));

        const res = await api.post("/organization/search", query);
        if (!res.ok) throw res;
        setData(res.data);
        setTotal(res.total);
      } catch (error) {
        captureError(error, "Erreur lors de la récupération des données");
      }
      setLoading(false);
    };
    fetchData();
  }, [filters]);

  return (
    <div className="bg-white shadow-lg p-12 space-y-12">
      <Helmet>
        <title>RNA - Administration - API Engagement</title>
      </Helmet>
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold flex-1">{total.toLocaleString("fr")} d'associations référencées</h2>

        <SearchInput value={filters.search} onChange={(search) => setFilters({ ...filters, search })} className="w-1/4" placeholder="Rechercher par mot-clé" />
      </div>

      <div className="border border-gray-border p-6">
        <TablePaginator
          data={data}
          pageSize={filters.size}
          length={total}
          onPageChange={(page) => setFilters({ ...filters, from: (page - 1) * filters.size })}
          loading={loading}
          renderHeader={() => (
            <>
              <h4 className="flex-1 pl-3">Titre de l'association</h4>
              <h4 className="w-1/5">RNA</h4>
              <h4 className="w-1/5">SIRET</h4>
              <h4 className="w-1/5">Créée le</h4>
              <h4 className="w-16">Statut</h4>
            </>
          )}
          renderItem={(item) => (
            <>
              <Link to={`/admin-organization/${item._id}`} className="line-clamp-3 max-w-xl flex-1 px-2 text-blue-dark">
                {item.title}
              </Link>
              <span className="w-1/5">{item.rna}</span>
              <span className="w-1/5">{item.siret}</span>
              <span className="w-1/5">{new Date(item.created_at).toLocaleDateString("fr")}</span>
              <div className="flex w-16 items-center">
                {item.status === "ACTIVE" ? (
                  <div className="flex items-center gap-2">
                    <p>Active</p>
                    <RiCheckboxCircleFill className="text-green-main" />
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <p>Inactive</p>
                    <RiCloseCircleFill className="text-red-main" />
                  </div>
                )}
              </div>
            </>
          )}
        />
      </div>
    </div>
  );
};

export default List;
