import HeroWebp from "~/assets/images/landings/reengagement-police/hero.webp";
import Benevole1Svg from "~/assets/svg/reengagement-police/benevole-1.svg";
import Benevole2Svg from "~/assets/svg/reengagement-police/benevole-2.svg";
import GendarmeSvg from "~/assets/svg/reengagement-police/gendarme.svg";
import PompierSvg from "~/assets/svg/reengagement-police/pompier.svg";
import ScratchSvg from "~/assets/svg/reengagement-police/scratch.svg";

// Visuel du hero recomposé depuis la maquette : trait de fond, photo détourée et uniformes dessinés par-dessus,
// pour garder les SVG nets à toutes les tailles. Les positions sont des pourcentages de la zone 774×662 de la
// maquette desktop, calée en bas à droite à partir de la tablette (même emprise que « Les défis de l'engagement »).
// Purement décoratif : tout est masqué aux technologies d'assistance.
export default function HeroVisual() {
  return (
    <div
      aria-hidden="true"
      className="relative mx-auto aspect-774/662 w-[97%] overflow-hidden md:absolute md:bottom-0 md:left-[45.3%] md:w-[60.2%] lg:right-0 lg:left-auto lg:w-[53.75%]"
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
