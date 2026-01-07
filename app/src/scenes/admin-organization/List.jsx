import { useEffect, useState } from "react";
import { RiCheckboxCircleFill, RiCloseCircleFill } from "react-icons/ri";
import { Link, useSearchParams } from "react-router-dom";

import Table from "../../components/NewTable";
import SearchInput from "../../components/SearchInput";
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
        captureError(error, { extra: { filters } });
      }
      setLoading(false);
    };
    fetchData();
  }, [filters]);

  return (
    <div className="space-y-12 bg-white p-12 shadow-lg">
      <title>RNA - Administration - API Engagement</title>
      <div className="flex items-center justify-between">
        <h2 className="flex-1 text-2xl font-semibold">{total.toLocaleString("fr")} d'associations référencées</h2>

        <SearchInput value={filters.search} onChange={(search) => setFilters({ ...filters, search })} className="w-1/4" placeholder="Rechercher par mot-clé" />
      </div>

      <div className="border border-gray-900 p-6">
        <Table
          header={[{ title: "Titre de l'organisation", colSpan: 3 }, { title: "RNA" }, { title: "SIRET" }, { title: "Créée le" }, { title: "Statut" }]}
          page={filters.from}
          pageSize={filters.size}
          onPageChange={(page) => setFilters({ ...filters, from: (page - 1) * filters.size })}
          length={total}
          loading={loading}
        >
          {data.map((item, i) => {
            const organizationId = item.id ?? `organization-${i}`;
            return (
              <tr key={organizationId} className={`${i % 2 === 0 ? "bg-gray-975" : "bg-gray-1000-active"} table-item`}>
                <td className="p-4" colSpan={3}>
                  <Link to={`/admin-organization/${organizationId}`} className="text-blue-france line-clamp-3 max-w-xl flex-1 px-2">
                    {item.title}
                  </Link>
                </td>
                <td className="px-4">{item.rna}</td>
                <td className="px-4">{item.siret}</td>
                <td className="px-4">{item.createdAt ? new Date(item.createdAt).toLocaleDateString("fr") : "-"}</td>
                <td className="px-6">
                  <div className="flex w-16 items-center">
                    {item.status === "ACTIVE" ? (
                      <div className="flex items-center gap-2">
                        <p>Active</p>
                        <RiCheckboxCircleFill className="text-green-success" />
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <p>Inactive</p>
                        <RiCloseCircleFill className="text-red-error" />
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </Table>
      </div>
    </div>
  );
};

export default List;
