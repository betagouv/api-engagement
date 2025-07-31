import { usePlausible } from "next-plausible";
import { useEffect, useRef, useState } from "react";
import { RiArrowLeftLine, RiArrowRightLine } from "react-icons/ri";

import useStore from "../utils/store";
import Card from "./Card";

const Carousel = ({ widget, missions, request }) => {
  const { url, color, mobile } = useStore();
  const ref = useRef(null);
  const [cardRef, setCardRef] = useState(null);
  const plausible = usePlausible();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [slidesToShow, setSlidesToShow] = useState(3);
  const [focusedSlideIndex, setFocusedSlideIndex] = useState(0);
  const [isCarouselFocused, setIsCarouselFocused] = useState(false);

  useEffect(() => {
    setCurrentSlide(0);
    setFocusedSlideIndex(0);
  }, [missions]);

  useEffect(() => {
    const breakpoint = () => {
      if (window.innerWidth < 640) {
        setSlidesToShow(1);
        return;
      }
      if (window.innerWidth < 768) {
        setSlidesToShow(2);
        return;
      }
      setSlidesToShow(3);
    };

    breakpoint();
    window.addEventListener("resize", breakpoint);
    return () => window.removeEventListener("resize", breakpoint);
  }, []);

  useEffect(() => {
    // Auto-scroll to show focused slide
    const slidePosition = Math.floor(focusedSlideIndex / slidesToShow) * slidesToShow;
    if (slidePosition !== currentSlide) {
      setCurrentSlide(slidePosition);
    }
  }, [focusedSlideIndex, slidesToShow]);

  const nextPage = () => {
    setCurrentSlide((prev) => Math.min(prev + slidesToShow, missions.length - slidesToShow));
    plausible("Slide changed", { u: url });
  };

  const prevPage = () => {
    setCurrentSlide((prev) => Math.max(prev - slidesToShow, 0));
    plausible("Slide changed", { u: url });
  };

  const handleKeyDown = (e) => {
    // Only handle arrow keys when the carousel is focused
    if (!isCarouselFocused) {
      return;
    }

    switch (e.key) {
      case "ArrowLeft":
        e.preventDefault();
        setFocusedSlideIndex((prev) => {
          const newIndex = prev > 0 ? prev - 1 : missions.length - 1;
          plausible("Slide navigation", { props: { direction: "left", slide: newIndex + 1 }, u: url });
          return newIndex;
        });
        break;
      case "ArrowRight":
        e.preventDefault();
        setFocusedSlideIndex((prev) => {
          const newIndex = prev < missions.length - 1 ? prev + 1 : 0;
          plausible("Slide navigation", { props: { direction: "right", slide: newIndex + 1 }, u: url });
          return newIndex;
        });
        break;
      case "Enter":
        e.preventDefault();
        if (cardRef) {
          cardRef.current.click();
        }
        break;
    }
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
    <main role="main" className="flex w-full flex-col gap-4">
      <section
        id="carousel"
        ref={ref}
        className="relative flex items-center gap-4"
        aria-label={`Carousel de missions. Mission ${focusedSlideIndex + 1} sur ${missions.length} sélectionnée.`}
        aria-roledescription="carousel"
        aria-describedby="carousel-instructions"
      >
        {/* Hidden instructions for screen readers */}
        <div id="carousel-instructions" className="sr-only">
          Utilisez Tab pour sélectionner le carousel, puis les flèches gauche et droite pour naviguer entre les missions. Actuellement sur la mission {focusedSlideIndex + 1} sur{" "}
          {missions.length}.
        </div>

        {!mobile && (
          <button
            onClick={prevPage}
            disabled={currentSlide === 0}
            tabIndex={0}
            className={`h-10 w-10 flex flex-shrink-0 items-center justify-center rounded-full p-2 focus:outline-none focus-visible:ring focus-visible:ring-blue-800 ${
              currentSlide === 0
                ? "cursor-not-allowed bg-[#e5e5e5] text-[#929292] opacity-50"
                : "cursor-pointer bg-[var(--bg-color)] text-white transition-opacity hover:opacity-90"
            }`}
            style={{ "--bg-color": color }}
            aria-label="Diapositive précédente"
            aria-controls="carousel-content"
          >
            <RiArrowLeftLine size={20} />
          </button>
        )}

        <div
          id="carousel-content"
          className="mx-auto overflow-hidden md:max-w-[1056px] md:py-2 md:my-2"
          tabIndex={0}
          onFocus={() => setIsCarouselFocused(true)}
          onBlur={() => setIsCarouselFocused(false)}
          onKeyDown={handleKeyDown}
        >
          <div
            className="flex transition-transform duration-500 ease-in-out"
            style={{ margin: "0 -0.75rem", transform: `translateX(-${currentSlide * (100 / slidesToShow)}%)` }}
            aria-live="polite"
            aria-atomic="false"
          >
            {missions.map((mission, i) => (
              <div
                key={i}
                role="group"
                id={mission._id}
                aria-roledescription="slide"
                aria-label={`Mission ${i + 1} sur ${missions.length}: ${mission.title}`}
                className={`h-auto flex-shrink-0 ${missions.length <= 2 ? "w-full flex-shrink-0 sm:w-1/2 lg:w-auto" : "w-full sm:w-1/2 lg:w-1/3"} px-3 transition-all duration-200`}
              >
                <Card widget={widget} mission={mission} color={color} request={request} onFocus={i === focusedSlideIndex && isCarouselFocused ? setCardRef : null} />
              </div>
            ))}
          </div>
        </div>

        {!mobile && (
          <button
            onClick={nextPage}
            disabled={currentSlide >= missions.length - slidesToShow}
            tabIndex={0}
            className={`h-10 w-10 flex flex-shrink-0 items-center justify-center rounded-full p-2 focus:outline-none focus-visible:ring focus-visible:ring-blue-800 ${
              currentSlide >= missions.length - slidesToShow
                ? "cursor-not-allowed bg-[#e5e5e5] text-[#929292] opacity-50"
                : "cursor-pointer bg-[var(--bg-color)] text-white transition-opacity hover:opacity-90"
            }`}
            style={{ "--bg-color": color }}
            aria-label="Diapositive suivante"
            aria-controls="carousel-content"
          >
            <RiArrowRightLine size={20} />
          </button>
        )}
      </section>

      {mobile && (
        <div className="flex justify-center">
          <div className="flex gap-4">
            <button
              onClick={prevPage}
              disabled={currentSlide === 0}
              className={`flex h-10 w-10 items-center justify-center rounded-full p-2 focus:outline-none focus-visible:ring focus-visible:ring-blue-800 ${currentSlide === 0 ? "cursor-not-allowed bg-[#e5e5e5] text-[#929292] opacity-50" : "cursor-pointer bg-[var(--bg-color)] text-white transition-opacity hover:opacity-90"}`}
              style={{ "--bg-color": color }}
              aria-label="Diapositive précédente"
              aria-controls="carousel-content"
            >
              <RiArrowLeftLine size={20} />
            </button>

            <button
              onClick={nextPage}
              disabled={currentSlide >= missions.length - slidesToShow}
              className={`flex h-10 w-10 items-center justify-center rounded-full p-2 focus:outline-none focus-visible:ring focus-visible:ring-blue-800 ${currentSlide >= missions.length - slidesToShow ? "cursor-not-allowed bg-[#e5e5e5] text-[#929292] opacity-50" : "cursor-pointer bg-[var(--bg-color)] text-white transition-opacity hover:opacity-90"}`}
              style={{ "--bg-color": color }}
              aria-label="Diapositive suivante"
              aria-controls="carousel-content"
            >
              <RiArrowRightLine size={20} />
            </button>
          </div>
        </div>
      )}
    </main>
  );
};

export default Carousel;
