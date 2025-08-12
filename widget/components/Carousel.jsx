import { usePlausible } from "next-plausible";
import { useEffect, useRef, useState } from "react";
import { RiArrowLeftLine, RiArrowRightLine } from "react-icons/ri";

import useStore from "../utils/store";
import Card from "./Card";

const Carousel = ({ widget, missions, request }) => {
  const { url, color, mobile } = useStore();
  const ref = useRef(null);
  const prevButtonRef = useRef(null);
  const nextButtonRef = useRef(null);
  const [cardsRef, setCardsRef] = useState(missions.map(() => null));
  const plausible = usePlausible();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [slidesToShow, setSlidesToShow] = useState(3);
  const [focusedSlideIndex, setFocusedSlideIndex] = useState(0);

  useEffect(() => {
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

  const handleNextPage = () => {
    setCurrentSlide((prev) => {
      const nextSlide = prev + slidesToShow;
      // If we've reached or passed the end, loop back to the beginning
      return nextSlide >= missions.length ? 0 : nextSlide;
    });
    plausible("Slide changed", { u: url });
  };

  const handlePrevPage = () => {
    setCurrentSlide((prev) => {
      // If we're at the beginning, loop to the last possible slide position
      if (prev <= 0) {
        const lastSlidePosition = Math.floor((missions.length - 1) / slidesToShow) * slidesToShow;
        return lastSlidePosition;
      }
      return prev - slidesToShow;
    });
    plausible("Slide changed", { u: url });
  };

  useEffect(() => {
    const slidePosition = Math.floor(focusedSlideIndex / slidesToShow) * slidesToShow;
    if (slidePosition !== currentSlide) {
      setCurrentSlide(slidePosition);
    }
  }, [focusedSlideIndex, slidesToShow]);

  useEffect(() => {
    if (cardsRef[0] && cardsRef[0].current) {
      cardsRef[0].current.focus({ preventScroll: true });
      cardsRef[0].current.setAttribute("aria-focused", "true");
      cardsRef[0].current.setAttribute("tabindex", "0");
    }
  }, [cardsRef[0]]);

  const handleKeyDown = (e) => {
    switch (e.key) {
      case "Tab":
        e.preventDefault();
        if (e.shiftKey) {
          prevButtonRef.current.focus();
        } else {
          nextButtonRef.current.focus();
        }
        if (cardsRef[focusedSlideIndex] && cardsRef[focusedSlideIndex].current) {
          cardsRef[focusedSlideIndex].current.blur();
          cardsRef[focusedSlideIndex].current.setAttribute("aria-focused", "false");
        }
        break;
      case "Left":
      case "ArrowLeft": {
        e.preventDefault();
        const newIndex = focusedSlideIndex > 0 ? focusedSlideIndex - 1 : missions.length - 1;

        // Auto-slide carousel if the focused card would be out of view
        const currentPage = Math.floor(focusedSlideIndex / slidesToShow);
        const newPage = Math.floor(newIndex / slidesToShow);
        if (newPage !== currentPage) {
          // The focused card is now on a different page, so we need to slide
          setCurrentSlide(newPage * slidesToShow);
        }

        if (cardsRef[newIndex] && cardsRef[newIndex].current) {
          cardsRef[newIndex].current.focus({ preventScroll: true });
        }
        setFocusedSlideIndex(newIndex);
        break;
      }
      case "Right":
      case "ArrowRight": {
        e.preventDefault();
        const newIndex = focusedSlideIndex < missions.length - 1 ? focusedSlideIndex + 1 : 0;

        // Auto-slide carousel if the focused card would be out of view
        const currentPage = Math.floor(focusedSlideIndex / slidesToShow);
        const newPage = Math.floor(newIndex / slidesToShow);
        if (newPage !== currentPage) {
          // The focused card is now on a different page, so we need to slide
          setCurrentSlide(newPage * slidesToShow);
        }

        if (cardsRef[newIndex] && cardsRef[newIndex].current) {
          cardsRef[newIndex].current.focus({ preventScroll: true });
        }
        setFocusedSlideIndex(newIndex);
        break;
      }
      case "Enter":
        e.preventDefault();
        if (cardsRef[focusedSlideIndex] && cardsRef[focusedSlideIndex].current) {
          cardsRef[focusedSlideIndex].current.click();
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
        role="region"
        ref={ref}
        className="relative flex items-center justify-center gap-4"
        aria-label={`Carousel de missions. Mission ${focusedSlideIndex + 1} sur ${missions.length} sélectionnée.`}
        aria-roledescription="carousel"
        aria-describedby="carousel-instructions"
      >
        {/* Hidden instructions for screen readers */}
        <div className="sr-only" aria-live="polite" aria-atomic="false">
          Mission {focusedSlideIndex + 1} sur {missions.length} : {missions[focusedSlideIndex].title}
        </div>

        {!mobile && (
          <button
            ref={prevButtonRef}
            onClick={handlePrevPage}
            className="h-10 w-10 flex flex-shrink-0 items-center justify-center rounded-full p-2 focus:outline-none focus-visible:ring focus-visible:ring-[#000091] text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: color }}
            aria-label="Diapositive précédente"
            aria-controls="carousel-content"
          >
            <RiArrowLeftLine size={20} />
          </button>
        )}

        <div id="carousel-content" className="overflow-hidden md:max-w-[1056px] w-full md:p-[1px] md:my-2">
          <div
            className="flex transition-transform duration-500 ease-in-out -mx-[0.75rem]"
            aria-live="polite"
            aria-atomic="false"
            style={{
              transform: `translateX(-${currentSlide * (100 / slidesToShow)}%)`,
            }}
          >
            {missions.map((mission, i) => (
              <div
                key={i}
                role="group"
                id={mission._id}
                aria-roledescription="slide"
                aria-label={`Mission ${i + 1} sur ${missions.length}: ${mission.title}`}
                aria-current={i === focusedSlideIndex}
                className={`h-auto flex-shrink-0 ${missions.length <= 2 ? "w-full flex-shrink-0 sm:w-1/2 lg:w-auto" : "w-full sm:w-1/2 lg:w-1/3"} px-3 transition-all duration-200`}
              >
                <Card
                  widget={widget}
                  mission={mission}
                  color={color}
                  request={request}
                  focused={i === focusedSlideIndex}
                  onKeyDown={handleKeyDown}
                  onRef={(ref) => {
                    setCardsRef((prev) => {
                      const newRefs = [...prev];
                      newRefs[i] = ref;
                      return newRefs;
                    });
                  }}
                  onFocus={() => setFocusedSlideIndex(i)}
                />
              </div>
            ))}
          </div>
        </div>

        {!mobile && (
          <button
            ref={nextButtonRef}
            onClick={handleNextPage}
            className="h-10 w-10 flex flex-shrink-0 items-center justify-center rounded-full p-2 focus:outline-none focus-visible:ring focus-visible:ring-[#000091] text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: color }}
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
              ref={prevButtonRef}
              onClick={handlePrevPage}
              className="flex h-10 w-10 items-center justify-center rounded-full p-2 focus:outline-none focus-visible:ring focus-visible:ring-[#000091] text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: color }}
              aria-label="Diapositive précédente"
              aria-controls="carousel-content"
            >
              <RiArrowLeftLine size={20} />
            </button>

            <button
              ref={nextButtonRef}
              onClick={handleNextPage}
              className="flex h-10 w-10 items-center justify-center rounded-full p-2 focus:outline-none focus-visible:ring focus-visible:ring-[#000091] text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: color }}
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
