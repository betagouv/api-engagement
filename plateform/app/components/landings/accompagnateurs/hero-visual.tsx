import HeroWebp from "~/assets/images/landings/accompagnateurs/hero.webp";
import JeuneBenevoleSvg from "~/assets/svg/accompagnateurs/jeune-benevole.svg";
import JeuneRocSvg from "~/assets/svg/accompagnateurs/jeune-roc.svg";
import JeuneSpvSvg from "~/assets/svg/accompagnateurs/jeune-spv.svg";
import StickerBoussoleSvg from "~/assets/svg/accompagnateurs/sticker-boussole.svg";
import StickerBulbSvg from "~/assets/svg/accompagnateurs/sticker-bulb.svg";
import StickerClic1Svg from "~/assets/svg/accompagnateurs/sticker-clic-1.svg";
import StickerClic2Svg from "~/assets/svg/accompagnateurs/sticker-clic-2.svg";
import SymboleSvg from "~/assets/svg/accompagnateurs/symbole.svg";

// Visuel du hero recomposé depuis la maquette : formes de fond, photo détourée et autocollants par-dessus.
// Les positions sont des pourcentages de la zone 780×673 de la maquette desktop ; les maquettes tablette et mobile ont
// le même ratio, seule la taille change : sous le formulaire (centré) puis, à partir du desktop, calé en bas à droite du hero.
// Le hero rogne ce qui dépasse. Purement décoratif : tout est masqué aux technologies d'assistance.
export default function HeroVisual() {
  return (
    <div
      aria-hidden="true"
      className="relative mx-auto mb-10 aspect-780/673 w-[calc(100%-2rem)] md:mb-14 md:w-[73%] lg:absolute lg:right-0 lg:bottom-[-4.3%] lg:mx-0 lg:mb-0 lg:w-[54.2%] lg:max-w-195"
    >
      <img src={SymboleSvg} alt="" className="absolute top-[48.88%] left-[69.43%] w-[28.18%]" />
      <img src={JeuneBenevoleSvg} alt="" className="absolute top-[-4.48%] left-[13.28%] w-[70.96%]" />
      <img src={JeuneRocSvg} alt="" className="absolute top-[0.61%] left-[64.07%] w-[45.58%]" />
      <img src={JeuneSpvSvg} alt="" className="absolute top-[65.88%] left-[9.36%] w-[47.62%]" />
      <img src={HeroWebp} alt="" className="absolute top-[14.88%] left-[12.83%] w-[73.31%]" />
      <img src={StickerBulbSvg} alt="" className="absolute top-[19.4%] left-[24.48%] w-[6.46%] -translate-1/2 -rotate-42" />
      <img src={StickerBoussoleSvg} alt="" className="absolute top-[9.95%] left-[30.97%] w-[6%] -translate-1/2" />
      <img src={StickerClic1Svg} alt="" className="absolute top-[45.25%] left-[92.6%] w-[6.7%] -translate-1/2 rotate-12" />
      <img src={StickerClic2Svg} alt="" className="absolute top-[40.4%] left-[88.95%] w-[2.8%] -translate-1/2 -rotate-165" />
    </div>
  );
}
