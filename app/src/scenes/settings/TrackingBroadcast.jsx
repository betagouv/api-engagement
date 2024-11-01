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
    navigator.clipboard.writeText(script.replace("{{publisherId}}", publisher._id));
    toast.success("Script copié");
  };

  return (
    <div className="space-y-4 p-12 bg-white shadow-lg">
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
          className="text-[#000091] underline text-sm"
        >
          Ouvrir la documentation
        </a>

        <button className="flex cursor-pointer items-center text-sm px-2 py-1 border border-blue-dark text-blue-dark" onClick={handleCopyScript}>
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
  );
};

export default TrackingBroadcast;
