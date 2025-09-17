import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { RiArrowRightSLine } from "react-icons/ri";
import { Link } from "react-router-dom";

import Loader from "../../components/Loader";
import SearchInput from "../../components/SearchInput";
import api from "../../services/api";
import { captureError } from "../../services/error";
import useStore from "../../services/store";

const PublishersTab = () => {
  const { publisher } = useStore();
  const [search, setSearch] = useState("");
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const query = { diffuseursOf: publisher._id };
        if (search) query.name = search;
        const res = await api.post("/publisher/search", query);
        if (!res.ok) throw res;
        setData(res.data);
        setTotal(res.total);
      } catch {
        captureError("Erreur lors de la récupération des données");
      }
      setLoading(false);
    };
    fetchData();
  }, [publisher, search]);

  return (
    <div className="space-y-12 p-12">
      <Helmet>
        <title>Partenaires diffuseurs - Vos Missions - API Engagement</title>
      </Helmet>
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h2 className="text-3xl font-bold">Mes partenaires diffuseurs</h2>
          <p>{`${total} partenaire${total > 1 ? "s" : ""}`}</p>
        </div>

        <div className="border-b-blue-france flex overflow-hidden rounded-t border-b">
          <label htmlFor="search-partner" className="sr-only">
            Chercher par nom
          </label>
          {/* <input  className="input flex-1" name="search-partner" placeholder="Chercher par nom" value={search} onChange={(e) => setSearch(e.target.value)} /> */}
          <SearchInput id="search-partner" placeholder="Chercher par nom" value={search} onChange={setSearch} />
        </div>
      </div>
      {loading ? (
        <div className="flex w-full justify-center p-12">
          <Loader />
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-10">
          {data.map((item, index) => {
            return (
              <div key={index} className="flex h-40 flex-col items-center border border-gray-900">
                <div className="text-gray-425 mt-2 text-center text-xs">{item.name}</div>
                <div className="flex h-24 w-full flex-1 items-center justify-center">
                  {item.logo && <img className="h-full w-full object-contain p-2" src={item.logo} alt={`${item.name} logo`} />}
                </div>
                {item.moderator && (
                  <div className="flex w-full items-center justify-center border-t border-gray-900 py-2">
                    <Link to={`/my-missions/moderated-mission/${item._id.toString()}`} className="text-blue-france text-xs">
                      Missions modérées
                      <RiArrowRightSLine className="ml-0.5 inline-block text-xs" />
                    </Link>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PublishersTab;
