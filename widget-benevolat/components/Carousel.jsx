import React, { useState, useEffect } from "react";
import { RiArrowLeftLine, RiArrowRightLine } from "react-icons/ri";
import { usePlausible } from "next-plausible";

import Card from "./Card";
import useStore from "../store";

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
      if (window.innerWidth < 640) return 1;
      if (window.innerWidth < 768) return 2;
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
    <div className="w-full flex flex-col gap-4">
      <div className="relative flex items-center gap-4">
        <button
          onClick={prevPage}
          disabled={currentSlide === 0}
          className="p-2 h-12 w-12 rounded-full hidden xl:flex items-center justify-center flex-shrink-0"
          style={{
            backgroundColor: currentSlide === 0 ? "#e5e5e5" : color,
            color: currentSlide === 0 ? "#929292" : "white",
          }}
          aria-label="Diapositive précédente"
        >
          <RiArrowLeftLine size={20} />
        </button>

        <div className="overflow-hidden md:max-w-[1056px] md:py-4 mx-auto">
          <div className="flex transition-transform duration-500 ease-in-out" style={{ margin: "0 -0.75rem", transform: `translateX(-${currentSlide * (100 / slidesToShow)}%)` }}>
            {missions.slice(0, 60).map((mission, i) => (
              <div
                role="group"
                key={i}
                id={mission._id}
                aria-labelledby={mission._id}
                className={`flex-shrink-0 h-auto ${missions.length <= 2 ? "w-full lg:w-auto sm:w-1/2 flex-shrink-0" : "w-full sm:w-1/2 lg:w-1/3"} px-3`}
              >
                <Card widget={widget} mission={mission} color={color} request={request} />
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={nextPage}
          disabled={currentSlide >= missions.length - slidesToShow}
          className="p-2 h-12 w-12 rounded-full hidden xl:flex items-center justify-center flex-shrink-0"
          style={{
            backgroundColor: currentSlide >= missions.length - slidesToShow ? "#e5e5e5" : color,
            color: currentSlide >= missions.length - slidesToShow ? "#929292" : "white",
          }}
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
            className="p-2 h-10 w-10 rounded-full flex items-center justify-center"
            style={{
              backgroundColor: currentSlide === 0 ? "#e5e5e5" : color,
              color: currentSlide === 0 ? "#929292" : "white",
            }}
            aria-label="Diapositive précédente"
          >
            <RiArrowLeftLine size={20} />
          </button>

          <button
            onClick={nextPage}
            disabled={currentSlide >= missions.length - slidesToShow}
            className="p-2 h-10 w-10 rounded-full flex items-center justify-center"
            style={{
              backgroundColor: currentSlide >= missions.length - slidesToShow ? "#e5e5e5" : color,
              color: currentSlide >= missions.length - slidesToShow ? "#929292" : "white",
            }}
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
