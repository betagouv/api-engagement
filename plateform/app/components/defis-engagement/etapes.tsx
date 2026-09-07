import MailSendSvg from "@gouvfr/dsfr/dist/artwork/pictograms/digital/mail-send.svg?url";
import SearchSvg from "@gouvfr/dsfr/dist/artwork/pictograms/digital/search.svg?url";
import SelfTrainingSvg from "@gouvfr/dsfr/dist/artwork/pictograms/digital/self-training.svg?url";

const ETAPES = [
  { icon: SelfTrainingSvg, title: "Réponds en trois minutes", description: "Le formulaire du gouv le plus court de ta vie" },
  { icon: SearchSvg, title: "Découvre les missions", description: "On te montre celles qui vont te plaire." },
  { icon: MailSendSvg, title: "Ton engagement commence ici", description: "On te met en relation avec le service public qui recrute" },
];

export default function Etapes({ onStartQuiz }: { onStartQuiz: () => void }) {
  return (
    <section className="fr-container fr-mb-8w">
      <h2 className="fr-h1 fr-mb-6w text-center">3 étapes pour passer à l'action !</h2>

      <ol className="fr-mb-6w m-0! grid list-none! grid-cols-1 gap-6 p-0! md:grid-cols-3">
        {ETAPES.map((etape) => (
          <li key={etape.title} className="bg-background flex flex-col items-center gap-4! px-6! py-9! text-center shadow-lg">
            <div className="bg-blue-france-975 flex size-24 items-center justify-center rounded-full">
              <img src={etape.icon} alt="" aria-hidden="true" className="size-[72px] dark:rounded-full dark:bg-white" />
            </div>
            <div>
              <h3 className="fr-h6 text-title-grey mb-1!">{etape.title}</h3>
              <p className="text-title-grey mb-0!">{etape.description}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="flex justify-center mt-16!">
        <button type="button" onClick={onStartQuiz} className="fr-btn fr-btn--secondary fr-btn--lg w-full justify-center md:w-auto">
          Trouve ta mission
        </button>
      </div>
    </section>
  );
}
