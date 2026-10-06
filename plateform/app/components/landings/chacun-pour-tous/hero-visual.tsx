import HeroWebp from "~/assets/images/landings/chacun-pour-tous/hero.webp";
import BadgeSvg from "~/assets/svg/chacun-pour-tous/badge.svg";
import CarteSvg from "~/assets/svg/chacun-pour-tous/carte.svg";
import CasqueTraitsSvg from "~/assets/svg/chacun-pour-tous/casque-traits.svg";
import CasqueSvg from "~/assets/svg/chacun-pour-tous/casque.svg";
import CurseurTraitsSvg from "~/assets/svg/chacun-pour-tous/curseur-traits.svg";
import CurseurSvg from "~/assets/svg/chacun-pour-tous/curseur.svg";
import GiletSvg from "~/assets/svg/chacun-pour-tous/gilet.svg";
import LogoSvg from "~/assets/svg/chacun-pour-tous/logo.svg";
import SymboleSvg from "~/assets/svg/chacun-pour-tous/symbole.svg";

// Visuel du hero recomposé depuis la maquette (photo détourée, logo de la campagne et pictos dessinés),
// pour garder les SVG nets à toutes les tailles. Les positions sont des pourcentages de la zone du visuel :
// 390×309 sous le texte sur mobile, 1052×759 calée en bas à droite à partir de la tablette.
// Purement décoratif : tout est masqué aux technologies d'assistance.
export default function HeroVisual() {
  return (
    <div aria-hidden="true" className="relative -mt-6 aspect-390/309 w-full md:absolute md:right-0 md:bottom-0 md:mt-0 md:aspect-1052/759 md:w-[64%] lg:w-[73%]">
      <img src={SymboleSvg} alt="" className="absolute top-0 left-[40.3%] w-[58%] md:top-[31.4%] md:left-[60.2%] md:w-[39%]" />
      <img src={HeroWebp} alt="" className="absolute top-[30.4%] left-[3.6%] h-[69.6%] w-[93.3%] object-cover object-top md:top-[34.9%] md:left-[14.4%] md:h-auto md:w-[79.6%]" />
      <img src={LogoSvg} alt="" className="absolute top-[12.5%] left-[9.8%] w-[44%] md:top-[13%] md:left-[66.1%] md:w-[21.9%]" />

      {/* Pictos casque, carte, gilet et badge : groupe de 330×228 dans la maquette desktop. */}
      <div className="absolute top-[14.2%] left-[65.4%] aspect-330/228 w-[36%] md:top-[32%] md:left-[72.1%] md:w-[31.4%]">
        <img src={CasqueSvg} alt="" className="absolute top-[22.8%] left-[18.6%] w-[20.9%] -translate-1/2 -rotate-[7.89deg]" />
        <img src={CasqueTraitsSvg} alt="" className="absolute top-[19.9%] left-[4.7%] w-[4.9%] -translate-1/2 rotate-[156.33deg]" />
        <img src={CarteSvg} alt="" className="absolute top-[16.8%] left-[58.7%] w-[27.1%] -translate-1/2 -rotate-[5.35deg]" />
        <img src={GiletSvg} alt="" className="absolute top-[53%] left-[39.1%] w-[20.4%] -translate-1/2 rotate-[5.78deg]" />
        <img src={BadgeSvg} alt="" className="absolute top-[73.3%] left-[81.6%] w-[23%] -translate-1/2 rotate-[43.1deg]" />
      </div>

      {/* Curseur « clic » : absent de la maquette mobile. */}
      <div className="absolute top-[66.5%] left-[2.3%] hidden aspect-94/98 w-[8.9%] md:block">
        <img src={CurseurSvg} alt="" className="absolute top-[66.3%] left-[60.9%] w-[73.8%] -translate-1/2 rotate-[11.99deg]" />
        <img src={CurseurTraitsSvg} alt="" className="absolute top-[21.4%] left-[20%] w-[31.3%] -translate-1/2 -rotate-[165.07deg]" />
      </div>
    </div>
  );
}
