import { toast } from "react-toastify";

import useStore from "../../services/store";

const script = `<script>
(function (i, s, o, g, r, a, m) {
i["ApiEngagementObject"] = r; (i[r] = i[r] || function () { (i[r].q = i[r].q || []).push(arguments); }), (i[r].l = 1 * new Date()); (a = s.createElement(o)), (m = s.getElementsByTagName(o)[0]); a.async = 1; a.src = g; m.parentNode.insertBefore(a, m);
})(window, document, "script", "https://app.api-engagement.beta.gouv.fr/jstag.js", "apieng");
apieng("config", "{{publisherId}}");
</script>`;

const TrackingBroadcast = () => {
  const { publisher } = useStore();

  const handleCopyScript = () => {
    navigator.clipboard.writeText(script.replace("{{publisherId}}", publisher.id));
    toast.success("Script copié");
  };

  return (
    <div className="space-y-4 bg-white p-12 shadow-lg">
      <div className="space-y-2">
        <h2 className="text-3xl font-bold">Script à intégrer sur votre site</h2>
        <p className="text-sm text-[#666666]">
          Afin d'assurer le suivi de leurs impressions, veuillez intégrez ce script sur toutes les pages sur lesquelles vous diffusez des liens de campagnes et des missions que
          vous diffusez par API.
        </p>
      </div>

      <div className="flex justify-between">
        <a
          href="https://doc.api-engagement.beta.gouv.fr/diffuser-des-missions/tracking-des-candidatures"
          target="_blank"
          rel="noreferrer"
          className="text-sm text-[#000091] underline"
        >
          Ouvrir la documentation
        </a>

        <button className="border-blue-france text-blue-france flex cursor-pointer items-center border px-2 py-1 text-sm" onClick={handleCopyScript}>
          Copier
        </button>
      </div>
      <textarea
        className="w-full rounded-none border border-[#E3E3FD] bg-[#F5F5FE] px-4 py-2 text-base disabled:opacity-80"
        rows={8}
        value={script.replace("{{publisherId}}", publisher.id)}
        disabled={true}
      />
    </div>
  );
};

export default TrackingBroadcast;
