import React from "react";
import Slider from "react-slick";
import { RiArrowLeftLine, RiArrowRightLine } from "react-icons/ri";

import Card from "./card";

export const Carousel = ({ widget, missions, color, request }) => {
  const DesktopPrevArrow = ({ onClick, currentSlide }) => {
    const disabled = currentSlide === 0;
    return (
      <div className="absolute top-1/2 translate-x-1/2 -left-16">
        <button
          className="flex justify-center items-center w-10 h-10 rounded-full text-lg disabled:bg-grey-400 disabled:hover:bg-grey-400 disabled:cursor-defaul focus:outline-none focus-visible:ring focus-visible:ring-blue-800"
          onClick={onClick}
          disabled={disabled}
          aria-label="Diapositive précédente"
          style={{ backgroundColor: disabled ? "#e5e5e5" : color, color: disabled ? "#929292" : "white" }}
        >
          <RiArrowLeftLine />
        </button>
      </div>
    );
  };
  const DesktopNextArrow = ({ onClick, currentSlide, slideCount }) => {
    const disabled = currentSlide >= slideCount - 3;
    return (
      <div className="absolute top-1/2 translate-x-1/2 -right-6">
        <button
          className="flex justify-center items-center w-10 h-10 rounded-full text-lg disabled:bg-grey-400 disabled:hover:bg-grey-400 disabled:cursor-default focus:outline-none focus-visible:ring focus-visible:ring-blue-800"
          onClick={onClick}
          disabled={disabled}
          aria-label="Diapositive suivante"
          style={{ backgroundColor: disabled ? "#e5e5e5" : color, color: disabled ? "#929292" : "white" }}
        >
          <RiArrowRightLine />
        </button>
      </div>
    );
  };
  const MobilePrevArrow = ({ onClick, currentSlide }) => {
    const disabled = currentSlide === 0;
    return (
      <div className="absolute left-[35%] top-[105%]">
        <button
          className="flex justify-center items-center w-10 h-10 border border-neutral-grey-950 text-black text-lg disabled:opacity-40 disabled:cursor-default focus:outline-none focus-visible:ring focus-visible:ring-blue-800"
          onClick={onClick}
          disabled={disabled}
          aria-label="Diapositive précédente"
        >
          <RiArrowLeftLine />
        </button>
      </div>
    );
  };
  const MobileNextArrow = ({ onClick, currentSlide, slideCount }) => {
    const disabled = currentSlide >= slideCount - 3;
    return (
      <div className="absolute right-[35%] top-[105%]">
        <button
          className="flex justify-center items-center w-10 h-10 border border-neutral-grey-950 text-black text-lg disabled:opacity-40 disabled:cursor-default focus:outline-none focus-visible:ring focus-visible:ring-blue-800"
          onClick={onClick}
          disabled={disabled}
          aria-label="Diapositive suivante"
        >
          <RiArrowRightLine />
        </button>
      </div>
    );
  };

  const settings = {
    speed: 500,
    slidesToShow: 3,
    slidesToScroll: 3,
    initialSlide: 0,
    prevArrow: <DesktopPrevArrow />,
    nextArrow: <DesktopNextArrow />,
    responsive: [
      {
        breakpoint: 639,
        // Center Mode
        centerMode: true,
        settings: {
          slidesToShow: 1,
          slidesToScroll: 1,
          initialSlide: 0,
          prevArrow: widget.style === "carousel" ? null : <MobilePrevArrow />,
          nextArrow: widget.style === "carousel" ? null : <MobileNextArrow />,
        },
      },
      {
        breakpoint: 767,
        settings: {
          slidesToShow: 2,
          slidesToScroll: 2,
          initialSlide: 0,
          prevArrow: <MobilePrevArrow />,
          nextArrow: <MobileNextArrow />,
        },
      },
      {
        breakpoint: 1023,
        settings: {
          slidesToShow: 2,
          slidesToScroll: 2,
          initialSlide: 0,
        },
      },
    ],
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

  if (missions.length <= 3) {
    return (
      <main className="w-full">
        <div className="flex justify-center sm:mx-2 gap-y-4 md:gap-y-12 gap-x-4">
          {missions.map((mission, i) => (
            <div role="group" key={i} id={mission._id} aria-labelledby={mission._id}>
              <Card widget={widget} mission={mission} color={color} request={request} />
            </div>
          ))}
        </div>
      </main>
    );
  }

  return (
    <main className="w-full">
      <Slider {...settings}>
        {missions.slice(0, 60).map((mission, i) => (
          <div role="group" key={i} id={mission._id} aria-labelledby={mission._id} style={{ display: "inline-block", width: "100%" }}>
            <Card widget={widget} mission={mission} color={color} request={request} />
          </div>
        ))}
      </Slider>
    </main>
  );
};
