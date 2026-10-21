import HeroWebp from "~/assets/images/landings/engagement-securite/hero.webp";
import Benevole1Svg from "~/assets/svg/engagement-securite/benevole-1.svg";
import Benevole2Svg from "~/assets/svg/engagement-securite/benevole-2.svg";
import GendarmeSvg from "~/assets/svg/engagement-securite/gendarme.svg";
import PompierSvg from "~/assets/svg/engagement-securite/pompier.svg";
import ScratchSvg from "~/assets/svg/engagement-securite/scratch.svg";

// Visuel du hero recomposé depuis la maquette : trait de fond, photo détourée et uniformes dessinés par-dessus,
// pour garder les SVG nets à toutes les tailles. Les positions sont des pourcentages de la zone 774×662 de la
// maquette desktop, calée en bas à droite à partir de la tablette (même emprise que « Les défis de l'engagement »).
// Au-delà de la maquette (1440px, ou zoom arrière), le visuel garde sa taille (774px) et sa place par rapport au contenu centré,
// au lieu de grandir et de rester collé au bord de l'écran.
// Sur tablette, il est agrandi (emprise de la maquette tablette) : les têtes arrivent au niveau du titre et le bas
// reste caché sous le bloc de localisation et les cartes.
// Sur mobile, le haut du visuel (transparent) remonte sous le bloc de localisation, comme dans la maquette.
// Purement décoratif : tout est masqué aux technologies d'assistance.
export default function HeroVisual() {
  return (
    <div
      aria-hidden="true"
      className="relative mx-auto -mt-16 aspect-774/662 w-[97%] overflow-hidden md:absolute md:mt-0 md:bottom-0 md:left-[41.7%] md:w-[78.5%] lg:right-[max(0px,calc((100%_-_1440px)/2))] lg:left-auto lg:w-[53.75%] lg:max-w-193.5"
    >
      <img src={ScratchSvg} alt="" className="absolute top-[42.9%] left-[68.8%] w-[89.6%] max-w-none -translate-1/2 -rotate-[7.41deg]" />
      <img src={HeroWebp} alt="" className="absolute top-[8.9%] left-[-8.08%] w-[111.36%] max-w-none" />
      <img src={PompierSvg} alt="" className="absolute top-[26.09%] left-[24.96%] w-[20.75%]" />
      <img src={Benevole1Svg} alt="" className="absolute top-[58.83%] left-[3.8%] w-[19.06%]" />
      <img src={Benevole2Svg} alt="" className="absolute top-[44.7%] left-[63.62%] w-[8.56%]" />
      <img src={GendarmeSvg} alt="" className="absolute top-[38.35%] left-[81.71%] w-[16.31%]" />
    </div>
  );
}
