import { Link } from "react-router";
import AscPng from "~/assets/images/asc-logo.png";
import JvaPng from "~/assets/images/jva-logo.png";
import RocPng from "~/assets/images/roc-logo.png";

type Testimonial = {
  id: string;
  image: string;
  tags: string[];
  body: string;
  publisherName: string;
  publisherLogo: string;
};

const TESTIMONIALS: Testimonial[] = [
  {
    id: "1",
    image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=400&q=80",
    tags: ["Sarah", "Service Civique"],
    body: "J'ai aidé des enfants à apprendre à lire pendant 8 mois. Une expérience qui m'a transformée et donné envie de devenir enseignante.",
    publisherName: "Service Civique",
    publisherLogo: AscPng,
  },
  {
    id: "2",
    image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80",
    tags: ["Karim", "Bénévole"],
    body: "Quelques heures par semaine pour les Restos du Cœur. Le contact humain et le sentiment d'utilité valent tout l'or du monde.",
    publisherName: "JeVeuxAider",
    publisherLogo: JvaPng,
  },
  {
    id: "3",
    image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80",
    tags: ["Léa", "Réserviste"],
    body: "Réserviste pour l'armée de terre depuis 2 ans. J'apprends la rigueur, le dépassement de soi et je sers mon pays.",
    publisherName: "Réserve des armées",
    publisherLogo: RocPng,
  },
  {
    id: "4",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80",
    tags: ["Thomas", "SPV"],
    body: "Sapeur-pompier volontaire dans mon village. Concilier ma vie pro et l'engagement, c'est exigeant mais tellement gratifiant.",
    publisherName: "Pompiers de France",
    publisherLogo: RocPng,
  },
];

export default function Testimonials() {
  return (
    <section className="bg-beige-gris-galet">
      <div className="fr-container fr-py-12w">
        <div className="text-center fr-mb-6w">
          <p className="fr-text--sm fr-mb-2w text-blue-france-sun font-bold uppercase">Témoignages</p>
          <h2 className="fr-h2 fr-mb-2w">Ils se sont engagés. Pourquoi pas toi ?</h2>
          <p className="fr-text--lead text-title-grey mx-auto max-w-3xl">Des histoires d'engagement de personnes comme toi, qui ont franchi le pas et n'en sont jamais revenues.</p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4 fr-mb-6w">
          {TESTIMONIALS.map((testimonial) => (
            <article key={testimonial.id} className="bg-background flex flex-col overflow-hidden rounded shadow-sm">
              <img src={testimonial.image} alt="" className="aspect-[4/3] w-full object-cover" loading="lazy" />
              <div className="flex flex-1 flex-col gap-3 p-5">
                <div className="flex flex-wrap gap-2">
                  {testimonial.tags.map((tag) => (
                    <span key={tag} className="fr-tag fr-tag--sm">
                      {tag}
                    </span>
                  ))}
                </div>
                <p className="fr-text--sm text-title-grey fr-mb-0 flex-1">{testimonial.body}</p>
                <div className="flex items-center gap-2">
                  <img src={testimonial.publisherLogo} alt="" className="size-7 rounded object-contain" />
                  <span className="fr-text--xs text-mention-grey line-clamp-1">{testimonial.publisherName}</span>
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="flex items-center justify-center gap-4">
          <button type="button" aria-label="Précédent" className="fr-btn fr-btn--secondary fr-btn--icon-left fr-icon-arrow-left-line" />
          <button type="button" aria-label="Suivant" className="fr-btn fr-btn--secondary fr-btn--icon-left fr-icon-arrow-right-line" />
          <Link to="/missions" className="fr-btn">
            Voir toutes les missions
          </Link>
        </div>
      </div>
    </section>
  );
}
