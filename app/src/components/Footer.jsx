import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="flex w-full flex-col justify-center bg-white border-t-2 border-blue-dark">
      <div className="border-b-border flex w-full items-center justify-between border-b px-20 py-10">
        <Link className="flex items-center p-2 hover:bg-gray-hover" to="/">
          <div className="h-full w-24">
            <p className="gouv-logo my-2 text-xs font-bold uppercase leading-3 text-black">
              République
              <br />
              française
            </p>
          </div>
          <div>
            <h2 className="m-0 text-xl font-bold leading-7 text-black">API Engagement</h2>
            <p className="text-sm text-grey-150">Plateforme de partage de missions de bénévolat et de volontariat</p>
          </div>
        </Link>
        <div>
          <p className="mb-4 max-w-lg text-sm text-grey-150">
            L'API vous permet de faciliter l'engagement en simplifiant la démarche de recherche d'une mission de bénévolat ou de volontariat
          </p>

          <div className="flex items-center gap-3 text-sm font-bold text-black">
            <a href="https://www.legifrance.gouv.fr/" target="_blank" className="underline">
              legifrance.gouv.fr
            </a>

            <a href="https://www.gouvernement.fr/" target="_blank" className="underline">
              gouvernement.fr
            </a>
            <a href="https://www.service-public.fr/" target="_blank" className="underline">
              service-public.fr
            </a>
            <a href="https://www.data.gouv.fr/fr/" target="_blank" className="underline">
              data.gouv.fr
            </a>
          </div>
        </div>
      </div>
      <div className="flex w-full items-center divide-x divide-gray-dark px-20 py-4 text-xs text-black">
        <a href="https://api-engagement.beta.gouv.fr/accessibilite/" className="pr-3 underline">
          Accessibilité : non conforme
        </a>
        {/* <a href="https://reserve-civique-metabase.osc-secnum-fr1.scalingo.io/public/dashboard/2dad1c3d-09e5-4d68-85bb-773b9c61e9a7" className="px-4 underline">
          Statistiques
        </a> */}
        <Link to="/public-stats" className="px-4 underline">
          Statistiques
        </Link>
        <a href="https://doc.api-engagement.beta.gouv.fr/" className="px-3 underline">
          Documentation
        </a>
        <a href="https://api-engagement.beta.gouv.fr/mentions-legales/" className="px-3 underline">
          Mentions légales
        </a>
        <a href="https://doc.api-engagement.beta.gouv.fr/get-started/rgpd" className="px-3 underline">
          Données personnelles et cookies
        </a>
        <Link to="cgu" className="pl-4 underline">
          CGU
        </Link>
      </div>
      <div className="items-baseliner inline-flex px-20 pb-4 pt-2 text-sm text-grey-150">
        Sauf mention contraire, tous les textes de ce site sont sous
        <a href="https://github.com/etalab/licence-ouverte/blob/master/LO.md" target="_blank" className="ml-1 underline">
          licence etatlab-2.0
        </a>
      </div>
    </footer>
  );
};

export default Footer;
