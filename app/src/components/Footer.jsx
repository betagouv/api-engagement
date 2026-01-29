import { RiExternalLinkLine } from "react-icons/ri";
import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer role="contentinfo" className="border-blue-france flex w-full flex-col justify-center border-t-2 bg-white">
      <div className="mx-auto w-full max-w-7xl">
        <div className="mt-10 flex items-center justify-between">
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
              <p className="text-sm">Plateforme de partage de missions de bénévolat et de volontariat</p>
            </div>
          </Link>
          <div className="max-w-2xl">
            <p className="text-grey-default mb-4 text-sm">
              L'API vous permet de faciliter l'engagement en simplifiant la démarche de recherche d'une mission de bénévolat ou de volontariat
            </p>

            <ul role="list" aria-label="Liens gouvernementaux" className="text-grey-default flex items-center text-sm font-bold">
              <li className="mr-6">
                <a href="https://www.legifrance.gouv.fr/" target="_blank" rel="noopener external" className="link-external">
                  legifrance.gouv.fr
                  <RiExternalLinkLine className="ml-1" />
                </a>
              </li>
              <li className="mr-6">
                <a href="https://www.gouvernement.fr/" target="_blank" rel="noopener external" className="link-external">
                  gouvernement.fr
                  <RiExternalLinkLine className="ml-1" />
                </a>
              </li>
              <li className="mr-6">
                <a href="https://www.service-public.fr/" target="_blank" rel="noopener external" className="link-external">
                  service-public.fr
                  <RiExternalLinkLine className="ml-1" />
                </a>
              </li>
              <li className="mr-6">
                <a href="https://www.data.gouv.fr/fr/" target="_blank" rel="noopener external" className="link-external">
                  data.gouv.fr
                  <RiExternalLinkLine className="ml-1" />
                </a>
              </li>
            </ul>
          </div>
        </div>

        <ul
          role="list"
          aria-label="Liens de pied de page"
          className="divide-text-mention border-grey-border text-text-mention mt-10 flex items-center divide-x border-t py-4 text-xs"
        >
          <li>
            <a href="https://api-engagement.beta.gouv.fr/accessibilite/" className="pr-3 hover:underline">
              Accessibilité : non conforme
            </a>
          </li>
          <li>
            <Link to="/public-stats" className="px-3 hover:underline">
              Statistiques
            </Link>
          </li>
          <li>
            <a href="https://doc.api-engagement.beta.gouv.fr/" className="px-3 hover:underline">
              Documentation
            </a>
          </li>
          <li>
            <a href="https://api-engagement.beta.gouv.fr/mentions-legales/" className="px-3 hover:underline">
              Mentions légales
            </a>
          </li>
          <li>
            <a href="https://doc.api-engagement.beta.gouv.fr/get-started/rgpd" className="px-3 hover:underline">
              Données personnelles et cookies
            </a>
          </li>
          <li>
            <a href="https://api-engagement.beta.gouv.fr/politique-de-confidentialite/" className="px-3 hover:underline">
              Politique de confidentialité
            </a>
          </li>
          <li>
            <Link to="cgu" className="pl-3 hover:underline">
              CGU
            </Link>
          </li>
        </ul>
        <p className="text-text-mention flex items-center py-4 text-xs">
          Sauf mention explicite de propriété intellectuelle détenue par des tiers, les contenus de ce site sont proposés sous
          <a href="https://github.com/etalab/licence-ouverte/blob/master/LO.md" target="_blank" className="ml-1 flex items-center hover:underline">
            licence etalab-2.0
            <RiExternalLinkLine className="ml-1" />
          </a>
        </p>
      </div>
    </footer>
  );
};

export default Footer;
