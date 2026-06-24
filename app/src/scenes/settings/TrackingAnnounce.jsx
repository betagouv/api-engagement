import { toast } from "@/services/toast";

import { BiSolidInfoSquare } from "react-icons/bi";

import useStore from "@/services/store";

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
    navigator.clipboard.writeText(script.replace("{{publisherId}}", publisher.id));
    toast.success("Script copié");
  };

  return (
    <div className="space-y-12 p-4 sm:p-12">
      <title>API Engagement - Tracking des événements - Paramètres</title>
      <div className="border-grey-border space-y-8 border p-4 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-2xl font-bold">Tracking des événements</h2>
          <a
            href="https://doc.api-engagement.beta.gouv.fr/annoncer-des-missions/tracking-des-candidatures/rajout-de-la-balise-et-des-commandes-de-tracking-par-le-tag"
            target="_blank"
            rel="noreferrer"
            className="text-blue-france shrink-0 text-sm underline"
          >
            Ouvrir la documentation
          </a>
        </div>

        <div className="border-info bg-blue-france-975 space-y-2 border-l-4 px-4 py-3">
          <h3 className="text-sm font-semibold">Comment tester votre intégration</h3>
          <p className="text-text-mention text-xs leading-5">
            Le tracking suit une chaîne en 3 étapes : (1) le bénévole arrive sur votre site via une <strong>URL trackée</strong> (contenant{" "}
            <span className="font-['courier']">?apiengagement_id=…</span>) ; (2) le script dépose un cookie <span className="font-['courier']">apiengagement</span> (30 jours) ; (3)
            au déclenchement de l'événement, un appel part <strong>seulement si le cookie est présent</strong>. Si vous ouvrez votre page sans passer par une URL trackée, aucun
            cookie n'est posé et rien n'est envoyé — ce n'est pas une erreur de votre code.
          </p>
          <p className="text-text-mention text-xs leading-5">
            Pour visualiser le cookie et les événements en temps réel, installez l'extension Chrome « API Engagement Tag Assistant » :{" "}
            <a href="https://github.com/betagouv/api-engagement/releases" target="_blank" rel="noreferrer" className="text-blue-france underline">
              télécharger depuis les releases
            </a>
            .
          </p>
        </div>

        <div className="space-y-4 border-b border-b-gray-900 pb-6">
          <div>
            <h3 className="text-base font-semibold">Commande de comptage d'une candidature</h3>
            <p className="text-text-mention text-xs">Lorsque vous enregistrez une candidature, effectuez cette commande chez vous nous permet de compter cette candidature.</p>
          </div>
          <div className="space-y-2">
            <div className="border-blue-france-925 bg-blue-france-975 overflow-x-auto rounded-none border px-4 py-2 text-sm">
              <code className="whitespace-nowrap">
                window.apieng && window.apieng("trackApplication", <span className="text-warning">clientId</span>)
              </code>
            </div>
            <button className="secondary-btn" onClick={() => handleCopyCommand(`window.apieng && window.apieng("trackApplication", "clientId")`)}>
              Copier
            </button>
          </div>
        </div>
        <div className="space-y-6 border-b border-b-gray-900 pb-6">
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-semibold">Commande de comptage d'une création de compte</h3>
              <p className="text-text-mention text-xs">
                Lorsque vous enregistrez une création de compte, effectuez cette commande chez vous nous permet de compter cette création de compte.
              </p>
            </div>
            <div className="space-y-2">
              <div className="border-blue-france-925 bg-blue-france-975 overflow-x-auto rounded-none border px-4 py-2 text-sm">
                <code className="whitespace-nowrap">
                  window.apieng && window.apieng("trackAccount", <span className="text-warning">clientId</span>)
                </code>
              </div>
              <button className="secondary-btn" onClick={() => handleCopyCommand(`window.apieng && window.apieng("trackAccount", "clientId")`)}>
                Copier
              </button>
            </div>
          </div>
          <div className="flex items-start gap-2 pb-6">
            <BiSolidInfoSquare className="text-info mt-1 text-xs" aria-hidden="true" />
            <p className="text-info text-xs leading-4">
              clientId = votre identifiant de mission utilisé dans le flux XML (transmis dans le paramètre <span className="font-['courier']">mission</span>). <br />
              Exemple : <span className="font-['courier']">window.apieng && window.apieng("trackAccount", "6294b108de43a106f6ca6d5f")</span> <br />
              NB: Si vous n’en avez pas, ne l’indiquez pas dans la commande. Exemple : <span className="font-['courier']">window.apieng && window.apieng(“trackAccount”)</span>
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <div>
              <h3 className="text-base font-semibold">Script à integrer sur votre site</h3>
              <p className="text-text-mention text-xs">{`Afin d'assurer le suivi des candidatures générées via l'API Engagement, ajoutez le script ci-dessous dans le <head></head> de votre page sur laquelle un bénévole candidate à une offre`}</p>
            </div>
            <button className="secondary-btn" onClick={handleCopyScript}>
              Copier
            </button>
          </div>
        </div>
        <textarea
          className="border-blue-france-925 bg-blue-france-975 w-full rounded-none border px-4 py-2 text-base read-only:opacity-80"
          rows={8}
          aria-label="Script à intégrer sur votre site"
          value={script.replace("{{publisherId}}", publisher.id)}
          readOnly
        />
      </div>
    </div>
  );
};

export default TrackingAnnounce;
