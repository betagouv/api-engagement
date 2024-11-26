import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { RiArrowRightSLine } from "react-icons/ri";
import { Link } from "react-router-dom";

import Loader from "../../components/Loader";
import api from "../../services/api";
import { captureError } from "../../services/error";
import useStore from "../../services/store";

const PublishersTab = () => {
  const { publisher } = useStore();
  const [search, setSearch] = useState("");
  const [data, setPublishers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await api.post("/publisher/search", { partnersOf: publisher._id });
        if (!res.ok) throw res;
        setPublishers(res.data);
      } catch {
        captureError("Erreur lors de la récupération des données");
      }
      setLoading(false);
    };
    fetchData();
  }, [publisher]);

  const handleSearch = (e) => {
    e.preventDefault();
    const search = e.target.value;

    if (search) setSearch(data.filter((w) => w.name.toLowerCase().includes(search.toLowerCase())));
    else setSearch(data);
  };

  if (loading)
    return (
      <div className="flex justify-center w-full p-12">
        <Loader />
      </div>
    );

  const count = data.filter((e) => e.name.toLowerCase().includes(search.toLowerCase())).length;

  return (
    <div className="space-y-12 p-12">
      <Helmet>
        <title>Partenaires diffuseurs - Vos Missions - API Engagement</title>
      </Helmet>
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h2 className="text-3xl font-bold">Mes partenaires diffuseurs</h2>
          <p>{`${count} partenaire${count > 1 ? "s" : ""}`}</p>
        </div>

        <div className="flex overflow-hidden rounded-t border-b border-b-blue-dark">
          <label htmlFor="search-partner" className="sr-only">
            Chercher par nom
          </label>
          <input id="search-partner" className="input flex-1" name="search-partner" placeholder="Chercher par nom" onChange={handleSearch} />
        </div>
      </div>
      <div className="grid grid-cols-4 gap-10">
        {data
          .filter((e) => e.name.toLowerCase().includes(search.toLowerCase()))
          .map((item, index) => {
            return (
              <div key={index} className="flex flex-col items-center border border-gray-border h-40">
                <div className="mt-2 text-center text-xs text-gray-dark">{item.name}</div>
                <div className="flex flex-1 items-center justify-center w-full h-24">
                  {item.logo && <img className="object-contain w-full h-full p-2" src={item.logo} alt={`${item.name} logo`} />}
                </div>
                {item.moderator && (
                  <div className="flex w-full items-center justify-center border-t border-gray-border py-2">
                    <Link to={`/my-missions/moderated-mission/${item._id.toString()}`} className="text-xs text-blue-dark">
                      Missions modérées
                      <RiArrowRightSLine className="ml-0.5 inline-block text-xs" />
                    </Link>
                  </div>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
};

export default PublishersTab;
