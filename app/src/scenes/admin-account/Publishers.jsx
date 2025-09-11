import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { HiOutlinePlus } from "react-icons/hi";
import { RiFileDownloadLine } from "react-icons/ri";
import { Link } from "react-router-dom";

import Loader from "../../components/Loader";
import Table from "../../components/Table";
import api from "../../services/api";
import { captureError } from "../../services/error";
import exportCSV from "../../services/utils";

const Publishers = () => {
  const [filters, setFilters] = useState({ name: "", role: "", sendReport: "", missionType: "" });
  const [exporting, setExporting] = useState(false);
  const [users, setUsers] = useState([]);
  const [diffuseurs, setDiffuseurs] = useState([]);
  const [publishers, setPublishers] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await api.post("/user/search");
        if (!res.ok) throw res;
        setUsers(res.data);
      } catch (error) {
        captureError(error, "Erreur lors de la récupération des utilisateurs");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const query = {};
        if (filters.name) query.name = filters.name;
        if (filters.role) query.role = filters.role;
        if (filters.sendReport === "true") query.sendReport = true;
        if (filters.sendReport === "false") query.sendReport = false;
        if (filters.missionType) query.missionType = filters.missionType;

        const res = await api.post("/publisher/search", query);
        if (!res.ok) throw res;
        setPublishers(res.data);
        if (!Object.keys(query).length) {
          setDiffuseurs(res.data);
        }
      } catch (error) {
        captureError(error, "Erreur lors de la récupération des partenaires");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [filters]);

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
      val["Role annonceur"] = publisher.isAnnonceur;
      val["Role diffuseur API"] = publisher.hasApiRights;
      val["Role diffuseur widget"] = publisher.hasWidgetRights;
      val["Role diffuseur campagne"] = publisher.hasCampaignRights;
      const annonceurs = publisher.publishers.map((p) => p.publisherName);
      val["Nombre d'annonceurs"] = annonceurs.length;
      val["Annonceurs"] = annonceurs;
      const broadcasters = publishers.filter((p) => p.publishers.find((e) => e.publisher === publisher._id.toString())).map((p) => p.name);
      val["Nombre de diffuseurs"] = broadcasters.length;
      val["Diffuseurs"] = broadcasters;
      const members = users.filter((e) => e.publishers.find((j) => j === publisher._id.toString())).map((e) => `${e.name} - ${e.email}`);
      val["Nombre de membres"] = members.length;
      val["Membres"] = members;
      val["Rapport automatique"] = publisher.sendReport;
      val["Nombre de destinataires"] = publisher.sendReportTo.length;
      val["Destinataires"] = publisher.sendReportTo.map((e) => users.find((j) => j._id.toString() === e).email);

      data.push(val);
    });
    exportCSV("partenaires", data);
    setExporting(false);
  };

  return (
    <div className="space-y-12 p-12">
      <Helmet>
        <title> Partenaires - Administration - API Engagement</title>
      </Helmet>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Liste des partenaires</h2>
          <p className="mt-2">Liste de comptes annonceurs et diffuseurs de l'API</p>
        </div>

        <div className="flex">
          <button className="button flex items-center text-blue-france hover:bg-gray-975" onClick={handleExport}>
            {exporting ? <Loader /> : <RiFileDownloadLine className="mr-2" />}
            Exporter
          </button>
          <Link to="/publisher/new" className="button flex items-center text-blue-france hover:bg-gray-975">
            Nouveau partenaire <HiOutlinePlus className="ml-2" />
          </Link>
        </div>
      </div>

      <div className="border border-gray-900 p-6">
        <div className="mb-6 flex items-center gap-4">
          <p className="font-semibold">{`${publishers.length} partenaire${publishers.length > 1 ? "s" : ""}`}</p>
          <label htmlFor="publisher-name" className="sr-only">
            Rechercher par nom
          </label>
          <input
            id="publisher-name"
            name="publisher-name"
            className="input flex-1"
            placeholder="Chercher par nom"
            value={filters.name}
            onChange={(e) => setFilters({ ...filters, name: e.target.value })}
          />

          <label htmlFor="publisher-role" className="sr-only">
            Filtrer par rôle
          </label>
          <select id="publisher-role" name="publisher-role" className="input w-[20%]" value={filters.role} onChange={(e) => setFilters({ ...filters, role: e.target.value })}>
            <option value="">Tous les rôles</option>
            <option value="annonceur">Tous les annonceurs</option>
            <option value="diffuseur">Tous les diffuseurs</option>
            <option value="api">Tous les diffuseurs api</option>
            <option value="widget">Tous les diffuseurs widget</option>
            <option value="campaign">Tous les diffuseurs campagne</option>
          </select>
          <label htmlFor="publisher-send-report" className="sr-only">
            Filtrer par rapport d'impact
          </label>
          <select
            className="input w-[20%] truncate"
            id="publisher-send-report"
            value={filters.sendReport.toString()}
            onChange={(e) => setFilters({ ...filters, sendReport: e.target.value })}
          >
            <option value="">Avec et sans rapport d'impact</option>
            <option value="true">Avec rapport d'impact</option>
            <option value="false">Sans rapport d'impact</option>
          </select>
          <label htmlFor="publisher-mission-type" className="sr-only">
            Filtrer par type de mission
          </label>
          <select
            className="input w-[20%] truncate"
            id="publisher-mission-type"
            value={filters.missionType}
            onChange={(e) => setFilters({ ...filters, missionType: e.target.value })}
          >
            <option value="">Type de mission</option>
            <option value="benevolat">Missions de bénévolat</option>
            <option value="volontariat">Missions de volontariat</option>
          </select>
        </div>
        {loading ? (
          <div className="flex h-full items-center justify-center py-12">
            <Loader />
          </div>
        ) : (
          <Table
            data={publishers}
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
            itemHeight="min-h-12"
            renderItem={(item) => (
              <>
                <Link to={`/publisher/${item._id.toString()}`} className="link flex-1">
                  {item.name}
                </Link>
                <div className="flex flex-1 flex-wrap justify-center gap-2">
                  {item.isAnnonceur && <span className="rounded bg-red-300 px-1 text-[10px]">Annonceur</span>}
                  {item.hasApiRights && <span className="rounded bg-green-300 px-1 text-[10px]">Diffuseur API</span>}
                  {item.hasWidgetRights && <span className="rounded bg-green-300 px-1 text-[10px]">Diffuseur Widget</span>}
                  {item.hasCampaignRights && <span className="rounded bg-green-300 px-1 text-[10px]">Diffuseur Campagne</span>}
                </div>
                <span className="w-32 text-center text-xs">{item.publishers.length}</span>
                <span className="w-32 text-center text-xs">{diffuseurs.filter((e) => e.publishers.some((j) => j.publisherId === item._id)).length}</span>
                <span className="w-32 text-center text-xs">{users.filter((e) => e.publishers.find((j) => j === item._id)).length}</span>
                <div className="w-32 text-center text-xs">
                  {item.sendReport ? (
                    <span className="rounded bg-blue-france-975 px-1">{`Oui (${item.sendReportTo.length} receveur${item.sendReportTo.length > 1 ? "s" : ""})`}</span>
                  ) : (
                    <span className="rounded bg-red-300 px-1">Non</span>
                  )}
                </div>
              </>
            )}
          />
        )}
      </div>
    </div>
  );
};

export default Publishers;
