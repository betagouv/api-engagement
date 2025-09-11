import { Helmet } from "react-helmet-async";
import { toast } from "react-toastify";

import { BiSolidInfoSquare } from "react-icons/bi";

import useStore from "../../services/store";

const script = `<script>
(function (i, s, o, g, r, a, m) {
i["ApiEngagementObject"] = r; (i[r] = i[r] || function () { (i[r].q = i[r].q || []).push(arguments); }), (i[r].l = 1 * new Date()); (a = s.createElement(o)), (m = s.getElementsByTagName(o)[0]); a.async = 1; a.src = g; m.parentNode.insertBefore(a, m);
})(window, document, "script", "https://app.api-engagement.beta.gouv.fr/jstag.js", "apieng");
apieng("config", "{{publisherId}}");
</script>`;

const TrackingAnnounce = () => {
  const { publisher } = useStore();

  const handleCopyCommand = (cmd) => {
    navigator.clipboard.writeText(cmd);
    toast.success("Commande copiée");
  };
  const handleCopyScript = () => {
    navigator.clipboard.writeText(script.replace("{{publisherId}}", publisher._id));
    toast.success("Script copié");
  };

  return (
    <div className="space-y-12 p-12">
      <Helmet>
        <title>Tracking des événements - Paramètres - API Engagement</title>
      </Helmet>
      <div className="border border-gray-900 p-8 space-y-8">
        <h2 className="text-2xl font-bold">Tracking des événements</h2>

        <div className="flex items-center justify-between gap-4 border-b border-b-gray-900 pb-6">
          <div className="flex-1">
            <h3 className="text-base font-semibold">Commande de comptage d'une candidature</h3>
            <p className="max-w-sm text-xs text-[#666666]">
              Lorsque vous enregistrez une candidature, effectuez cette commande chez vous nous permet de compter cette candidature.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-[535px] px-4 py-2 rounded-none disabled:opacity-80 bg-[#F5F5FE] border border-[#E3E3FD] text-base whitespace-nowrap">
              window.apieng && window.apieng("trackApplication", <span className="text-[#b34000] font-['courier']">clientId</span>)
            </div>
            <button className="empty-button text-base py-2 px-4" onClick={() => handleCopyCommand(`window.apieng && window.apieng("trackApplication", "clientId")`)}>
              Copier
            </button>
          </div>
        </div>
        <div className="border-b border-b-gray-900 pb-6 space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <h3 className="text-base font-semibold">Commande de comptage d'une création de compte</h3>
              <p className="max-w-sm text-xs text-[#666666]">
                Lorsque vous enregistrez une création de compte, effectuez cette commande chez vous nous permet de compter cette création de compte.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-[535px] px-4 py-2 rounded-none disabled:opacity-80 bg-[#F5F5FE] border border-[#E3E3FD] text-base whitespace-nowrap">
                window.apieng && window.apieng("trackAccount", <span className="text-[#b34000] font-['courier']">clientId</span>)
              </div>
              <button className="empty-button text-base py-2 px-4" onClick={() => handleCopyCommand(`window.apieng && window.apieng("trackAccount", "clientId")`)}>
                Copier
              </button>
            </div>
          </div>
          <div className="flex items-start gap-2 pb-6">
            <BiSolidInfoSquare className="text-xs text-[#0063CB] mt-1" />
            <p className="text-xs text-[#0063CB] leading-4">
              clientId = votre identifiant de mission utilisé dans le flux XML. <br />
              Exemple : <span className="font-['courier']">window.apieng && window.apieng("trackAccount", "6294b108de43a106f6ca6d5f")</span> <br />
              NB: Si vous n’en avez pas, ne l’indiquez pas dans la commande. Exemple : <span className="font-['courier']">window.apieng && window.apieng(“trackAccount”)</span>
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold">Script à integrer sur votre site</h3>
            <p className="text-xs w-4/5 text-[#666666]">{`Afin d’assurer le suivi des candidatures générées via l’API Engagement, ajoutez le script ci-dessous dans le <head></head> de votre page sur laquelle un bénévole candidate à une offre`}</p>
          </div>
          <button className="flex cursor-pointer items-center text-sm px-2 py-1 border border-blue-france text-blue-france" onClick={handleCopyScript}>
            Copier
          </button>
        </div>
        <textarea
          className="px-4 py-2 text-base rounded-none disabled:opacity-80 w-full bg-[#F5F5FE] border border-[#E3E3FD]"
          rows={8}
          value={script.replace("{{publisherId}}", publisher._id)}
          disabled={true}
        />
      </div>
    </div>
  );
};

export default TrackingAnnounce;
