import { usePlausible } from "next-plausible";
import { useEffect, useState } from "react";
import { RiArrowLeftLine, RiArrowRightLine } from "react-icons/ri";

import useStore from "../utils/store";
import Card from "./Card";

const Carousel = ({ widget, missions, request }) => {
  const { url, color } = useStore();
  const plausible = usePlausible();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [slidesToShow, setSlidesToShow] = useState(3);

  useEffect(() => {
    setCurrentSlide(0);
  }, [missions]);

  useEffect(() => {
    const getSlidesToShow = () => {
      if (window.innerWidth < 640) {
        return 1;
      }
      if (window.innerWidth < 768) {
        return 2;
      }
      return 3;
    };

    const breakpoint = () => {
      setSlidesToShow(getSlidesToShow());
    };

    breakpoint();
    window.addEventListener("resize", breakpoint);
    return () => window.removeEventListener("resize", breakpoint);
  }, []);

  const nextPage = () => {
    setCurrentSlide((prev) => Math.min(prev + slidesToShow, missions.length - slidesToShow));
    plausible("Slide changed", { u: url });
  };

  const prevPage = () => {
    setCurrentSlide((prev) => Math.max(prev - slidesToShow, 0));
    plausible("Slide changed", { u: url });
  };

  if (missions.length === 0) {
    return (
      <div className="w-full">
        <div className="flex items-center justify-center py-4">
          <p className="text-lg font-semibold">Aucune mission ne correspond à vos critères de recherche</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="relative flex items-center gap-4">
        <button
          onClick={prevPage}
          disabled={currentSlide === 0}
          className={`hidden h-12 w-12 flex-shrink-0 items-center justify-center rounded-full p-2 xl:flex ${
            currentSlide === 0 ? "cursor-not-allowed bg-[#e5e5e5] text-[#929292] opacity-50" : "cursor-pointer bg-[var(--bg-color)] text-white transition-opacity hover:opacity-90"
          }`}
          style={{ "--bg-color": color }}
          aria-label="Diapositive précédente"
        >
          <RiArrowLeftLine size={20} />
        </button>

        <div className="mx-auto overflow-hidden md:max-w-[1056px] md:py-4">
          <div className="flex transition-transform duration-500 ease-in-out" style={{ margin: "0 -0.75rem", transform: `translateX(-${currentSlide * (100 / slidesToShow)}%)` }}>
            {missions.slice(0, 60).map((mission, i) => (
              <div
                role="group"
                key={i}
                id={mission._id}
                aria-labelledby={mission._id}
                className={`h-auto flex-shrink-0 ${missions.length <= 2 ? "w-full flex-shrink-0 sm:w-1/2 lg:w-auto" : "w-full sm:w-1/2 lg:w-1/3"} px-3`}
              >
                <Card widget={widget} mission={mission} color={color} request={request} />
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={nextPage}
          disabled={currentSlide >= missions.length - slidesToShow}
          className={`hidden h-12 w-12 flex-shrink-0 items-center justify-center rounded-full p-2 xl:flex ${
            currentSlide >= missions.length - slidesToShow
              ? "cursor-not-allowed bg-[#e5e5e5] text-[#929292] opacity-50"
              : "cursor-pointer bg-[var(--bg-color)] text-white transition-opacity hover:opacity-90"
          }`}
          style={{ "--bg-color": color }}
          aria-label="Diapositive suivante"
        >
          <RiArrowRightLine size={20} />
        </button>
      </div>

      <div className="flex justify-center xl:hidden">
        <div className="flex gap-4">
          <button
            onClick={prevPage}
            disabled={currentSlide === 0}
            className={`flex h-10 w-10 items-center justify-center rounded-full p-2 ${currentSlide === 0 ? "cursor-not-allowed bg-[#e5e5e5] text-[#929292] opacity-50" : "cursor-pointer bg-[var(--bg-color)] text-white transition-opacity hover:opacity-90"}`}
            style={{ "--bg-color": color }}
            aria-label="Diapositive précédente"
          >
            <RiArrowLeftLine size={20} />
          </button>

          <button
            onClick={nextPage}
            disabled={currentSlide >= missions.length - slidesToShow}
            className={`flex h-10 w-10 items-center justify-center rounded-full p-2 ${currentSlide >= missions.length - slidesToShow ? "cursor-not-allowed bg-[#e5e5e5] text-[#929292] opacity-50" : "cursor-pointer bg-[var(--bg-color)] text-white transition-opacity hover:opacity-90"}`}
            style={{ "--bg-color": color }}
            aria-label="Diapositive suivante"
          >
            <RiArrowRightLine size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Carousel;
