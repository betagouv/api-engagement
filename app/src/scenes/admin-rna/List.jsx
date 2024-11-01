import { Menu, Transition } from "@headlessui/react";
import { Fragment, useEffect, useState } from "react";
import { RiArrowDownSLine, RiCheckboxCircleFill, RiCloseCircleFill } from "react-icons/ri";
import { Link, useSearchParams } from "react-router-dom";

import SearchInput from "../../components/SearchInput";
import { TablePaginator } from "../../components/Table";
import api from "../../services/api";
import { captureError } from "../../services/error";

const List = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState({
    size: 25,
    from: 0,
    search: searchParams.get("search") || "",
    department: searchParams.get("department") || null,
    city: searchParams.get("city") || null,
  });
  const [options, setOptions] = useState({
    domains: [],
    departments: [],
    cities: [],
  });
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const query = new URLSearchParams();

        if (filters.city) query.append("city", filters.city);
        if (filters.department) query.append("department", filters.department);
        if (filters.search) query.append("search", filters.search);
        if (filters.from) query.append("from", filters.from);
        query.append("size", filters.size);

        setSearchParams(query);

        const res = await api.get(`/rna?${query.toString()}`);

        if (!res.ok) throw res;
        setData(res.data.hits);
        setOptions(res.data.aggs);
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
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold flex-1">{total.toLocaleString("fr")} d'associations référencées</h2>

        <SearchInput value={filters.search} onChange={(search) => setFilters({ ...filters, search })} className="w-1/4" placeholder="Rechercher par mot-clé" />
      </div>

      <div className="border border-gray-border p-6">
        <div className="mb-6 flex items-center gap-4 border-b border-b-gray-border pb-6">
          <p className="font-bold">Filtrer les resultats</p>
          <Filter name="city" title="Villes" options={options.cities} filters={filters} setFilters={setFilters} />
          <Filter name="departement" title="Departements" options={options.departments} filters={filters} setFilters={setFilters} />
        </div>
        <TablePaginator
          data={data}
          pageSize={filters.size}
          length={total}
          onPageChange={(page) => setFilters({ ...filters, from: (page - 1) * filters.size })}
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
              <Link to={`/admin-rna/${item._id}`} className="line-clamp-3 max-w-xl flex-1 px-2 text-blue-dark">
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

const Filter = ({ name, title, options, filters, setFilters, labels = (v) => v }) => {
  if (!options || !options.length) return null;

  const handleSelect = (value) => {
    if (filters[name]) {
      if (filters[name] === value) {
        const newFilters = { ...filters };
        delete newFilters[name];
        setFilters(newFilters);
      } else {
        setFilters({ ...filters, [name]: value });
      }
    } else {
      setFilters({ ...filters, [name]: value });
    }
  };
  return (
    <Menu as="div" className="relative inline-block flex-1 text-left">
      <Menu.Button as="div" className="select flex items-center justify-between">
        <span className="font-semibold">{title}</span>
        <RiArrowDownSLine className="ml-3" />
      </Menu.Button>
      <Transition
        as={Fragment}
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <Menu.Items className="absolute right-0 z-30 mt-2 max-h-72 w-56 origin-top-right overflow-y-auto border border-gray-border bg-white text-black focus:outline-none">
          {options.map(
            (f, i) =>
              f.key && (
                <Menu.Item key={i}>
                  {({ active }) => (
                    <div
                      className={`flex cursor-pointer items-center justify-between p-2 pr-4 text-sm ${active ? "bg-gray-light" : ""} ${
                        filters[name] === f.key ? "border-r-2 border-r-blue-dark text-blue-dark" : "border-none text-black"
                      }`}
                      onClick={() => handleSelect(f.key)}
                    >
                      <p>{labels(f.key) || f.key}</p>
                      <span>{f.doc_count}</span>
                    </div>
                  )}
                </Menu.Item>
              ),
          )}
        </Menu.Items>
      </Transition>
    </Menu>
  );
};

export default List;
