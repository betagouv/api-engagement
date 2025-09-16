import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="border-blue-france flex w-full flex-col justify-center border-t-2 bg-white">
      <div className="border-b-border flex w-full items-center justify-between border-b border-gray-900 px-20 py-10">
        <Link className="hover:bg-gray-975 flex items-center p-2" to="/">
          <div className="h-full w-24">
            <p className="gouv-logo my-2 text-xs leading-3 font-bold text-black uppercase">
              République
              <br />
              française
            </p>
          </div>
          <div>
            <h2 className="m-0 text-xl leading-7 font-bold text-black">API Engagement</h2>
            <p className="text-sm text-gray-200">Plateforme de partage de missions de bénévolat et de volontariat</p>
          </div>
        </Link>
        <div>
          <p className="mb-4 max-w-lg text-sm text-gray-200">
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
      <div className="divide-gray-425 flex w-full items-center divide-x px-20 py-4 text-xs text-black">
        <a href="https://api-engagement.beta.gouv.fr/accessibilite/" className="pr-3 underline">
          Accessibilité : non conforme
        </a>
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
        <a href="https://api-engagement.beta.gouv.fr/politique-de-confidentialite/" className="px-3 underline">
          Politique de confidentialité
        </a>
        <Link to="cgu" className="pl-4 underline">
          CGU
        </Link>
      </div>
      <div className="items-baseliner inline-flex px-20 pt-2 pb-4 text-sm text-gray-200">
        Sauf mention contraire, tous les textes de ce site sont sous
        <a href="https://github.com/etalab/licence-ouverte/blob/master/LO.md" target="_blank" className="ml-1 underline">
          licence etalab-2.0
        </a>
      </div>
    </footer>
  );
};

export default Footer;
