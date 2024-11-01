import { useEffect, useState } from "react";
import { HiOutlinePlus } from "react-icons/hi";
import { RiFileDownloadLine } from "react-icons/ri";
import { Link } from "react-router-dom";

import Loader from "../../components/Loader";
import Table from "../../components/Table";
import api from "../../services/api";
import { captureError } from "../../services/error";
import exportCSV from "../../services/utils";

const Publishers = () => {
  const [filters, setFilters] = useState({ role: "", automated_report: "", mission_type: "" });
  const [exporting, setExporting] = useState(false);
  const [users, setUsers] = useState([]);
  const [publishers, setPublishers] = useState([]);
  const [displayedPublishers, setDisplayedPublishers] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const resP = await api.post("/publisher/search");
        if (!resP.ok) throw resP;
        setPublishers(resP.data.sort((a, b) => a.name.localeCompare(b.name)));
        setDisplayedPublishers(resP.data);

        const resU = await api.get(`/user`);
        if (!resU.ok) throw resU;
        setUsers(resU.data);
      } catch (error) {
        captureError(error, "Erreur lors de la récupération des données");
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (publishers) {
      let filtered = publishers;
      if (filters.role)
        filtered = filtered.filter((s) => {
          if (filters.role === "broadcast") return s.role_annonceur_api || s.role_annonceur_widget || s.role_annonceur_campagne;
          if (filters.role === "announce") return s.role_promoteur;
          if (filters.role === "api") return s.role_annonceur_api;
          if (filters.role === "widget") return s.role_annonceur_widget;
          if (filters.role === "campaign") return s.role_annonceur_campagne;
          else return s[filters.role];
        });

      if (filters.mission_type === "volontariat")
        filtered = filtered.filter((p) => p.mission_type === "volontariat" || p.publishers.some((n) => n.publisherName === "Service Civique"));
      if (filters.mission_type === "benevolat") filtered = filtered.filter((p) => p.publishers.some((n) => n.publisherName !== "Service Civique"));

      if (filters.automated_report === "true") filtered = filtered.filter((s) => s.automated_report);
      if (filters.automated_report === "false") filtered = filtered.filter((s) => !s.automated_report);
      setDisplayedPublishers(filtered);
    }
  }, [filters]);

  const handleSearch = (e) => {
    e.preventDefault();
    const search = e.target.value;
    if (search) setDisplayedPublishers(publishers.filter((p) => p.name.toLowerCase().includes(search.toLowerCase())));
    else setDisplayedPublishers(publishers);
  };

  const handleExport = () => {
    if (!publishers) return;
    setExporting(true);
    const data = [];
    publishers.forEach((publisher) => {
      const val = {};
      val["Id"] = publisher._id;
      val["Nom"] = publisher.name;
      val["Email"] = publisher.email;
      val["URL"] = publisher.url;
      val["Role annonceur"] = publisher.role_promoteur;
      val["Role diffuseur API"] = publisher.role_annonceur_api;
      val["Role diffuseur widget"] = publisher.role_annonceur_widget;
      val["Role diffuseur campagne"] = publisher.role_annonceur_campagne;
      const annonceurs = publisher.publishers.map((p) => p.publisherName);
      val["Nombre d'annonceurs"] = annonceurs.length;
      val["Annonceurs"] = annonceurs;
      const broadcasters = publishers.filter((p) => p.publishers.find((e) => e.publisher === publisher._id.toString())).map((p) => p.name);
      val["Nombre de diffuseurs"] = broadcasters.length;
      val["Diffuseurs"] = broadcasters;
      const members = users.filter((e) => e.publishers.find((j) => j === publisher._id.toString())).map((e) => `${e.name} - ${e.email}`);
      val["Nombre de membres"] = members.length;
      val["Membres"] = members;
      val["Rapport automatique"] = publisher.automated_report;
      val["Nombre de destinataires"] = publisher.send_report_to.length;
      val["Destinataires"] = publisher.send_report_to.map((e) => users.find((j) => j._id.toString() === e).email);

      data.push(val);
    });
    exportCSV("partenaires", data);
    setExporting(false);
  };

  if (!users) return <h2 className="p-3">Chargement...</h2>;

  return (
    <div className="space-y-12 p-12">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Liste des partenaires</h2>
          <p className="mt-2">Liste de comptes annonceurs et diffuseurs de l'API</p>
        </div>

        {/* <button className="button border border-blue-dark bg-white text-blue-dark hover:bg-gray-hover" onClick={buildExport}>
          Exporter
        </button> */}
        <div className="flex">
          <button className="button flex items-center text-blue-dark hover:bg-gray-hover" onClick={handleExport}>
            {exporting ? <Loader /> : <RiFileDownloadLine className="mr-2" />}
            Exporter
          </button>
          <Link to="/publisher/new" className="button flex items-center text-blue-dark hover:bg-gray-hover">
            Nouveau partenaire <HiOutlinePlus className="ml-2" />
          </Link>
        </div>
      </div>

      <div className="border border-gray-border p-6">
        <div className="mb-6 flex items-center gap-4">
          <p className="font-semibold">{`${displayedPublishers.length} partenaire${displayedPublishers.length > 1 ? "s" : ""}`}</p>

          <input className="input flex-1" placeholder="Chercher par nom" onChange={handleSearch} />

          <select className="input w-[20%]" value={filters.role} onChange={(e) => setFilters({ ...filters, role: e.target.value })}>
            <option value="">Tous les rôles</option>
            <option value="announce">Tous les annonceurs</option>
            <option value="broadcast">Tous les diffuseurs</option>
            <option value="api">Tous les diffuseurs api</option>
            <option value="widget">Tous les diffuseurs widget</option>
            <option value="campaign">Tous les diffuseurs campagne</option>
          </select>
          <select className="input w-[20%] truncate" defaultValue="" onChange={(e) => setFilters({ ...filters, automated_report: e.target.value })}>
            <option value="">Avec et sans rapport d'impact</option>
            <option value="true">Avec rapport d'impact</option>
            <option value="false">Sans rapport d'impact</option>
          </select>
          <select className="input w-[20%] truncate" value={filters.mission_type} onChange={(e) => setFilters({ ...filters, mission_type: e.target.value })}>
            <option value="">Type de mission</option>
            <option value="benevolat">Missions de bénévolat</option>
            <option value="volontariat">Missions de volontariat</option>
          </select>
        </div>
        <Table
          data={displayedPublishers}
          renderHeader={() => (
            <>
              <h4 className="flex-1">Nom</h4>
              <h4 className="flex-1 text-center">Rôles</h4>
              <h4 className="w-32 text-center">Nombre d'annonceurs</h4>
              <h4 className="w-32 text-center">Nombre de diffuseurs</h4>
              <h4 className="w-32 text-center">Nombre de membres</h4>
              <h4 className="w-32 text-center">Rapport d'impact</h4>
            </>
          )}
          itemHeight={"min-h-[3rem]"}
          renderItem={(item) => (
            <>
              <Link to={`/publisher/${item._id.toString()}`} className="link flex-1">
                {item.name}
              </Link>
              <div className="flex flex-1 flex-wrap justify-center gap-2">
                {item.role_promoteur && <span className="rounded bg-red-light px-1 text-[10px]">Annonceur</span>}
                {item.role_annonceur_api && <span className="rounded bg-green-light px-1 text-[10px]">Diffuseur API</span>}
                {item.role_annonceur_widget && <span className="rounded bg-green-light px-1 text-[10px]">Diffuseur Widget</span>}
                {item.role_annonceur_campagne && <span className="rounded bg-green-light px-1 text-[10px]">Diffuseur Campagne</span>}
              </div>
              <span className="w-32 text-center text-xs">{item.publishers.length}</span>
              <span className="w-32 text-center text-xs">{publishers.filter((e) => e.publishers.find((j) => j.publisher === item._id.toString())).length}</span>
              <span className="w-32 text-center text-xs">{users.filter((e) => e.publishers.find((j) => j === item._id.toString())).length}</span>
              <div className="w-32 text-center text-xs">
                {item.automated_report ? (
                  <span className="rounded bg-blue-light px-1">{`Oui (${item.send_report_to.length} receveur${item.send_report_to.length > 1 ? "s" : ""})`}</span>
                ) : (
                  <span className="rounded bg-red-light px-1">Non</span>
                )}
              </div>
            </>
          )}
        />
      </div>
    </div>
  );
};

export default Publishers;
