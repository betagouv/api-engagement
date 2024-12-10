import React from "react";
import Image from "next/image";
import iso from "i18n-iso-countries";
import { RiBuildingFill } from "react-icons/ri";

import { DOMAINES } from "../config";

const Card = ({ widget, mission, request }) => {
  if (!mission) return null;

  return (
    <a
      tabIndex={0}
      href={mission.url}
      target="_blank"
      className={`${
        widget.style === "carousel" ? "max-w-[336px] max-h-[460px] xl:max-h-[500px]" : "w-full"
      } group border h-full mx-auto flex flex-col border-neutral-grey-950 overflow-hidden focus:outline-none focus-visible:ring focus-visible:ring-blue-800 hover:shadow-lg transition-shadow duration-300`}
    >
      <div className="min-h-[188px] max-h-[188px] xl:min-h-[200px] xl:max-h-[200px] overflow-hidden">
        <Image
          src={mission.domainLogo}
          alt={mission.title}
          priority={true}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
          width={500}
          height={500}
        />
      </div>

      <div className="flex-1 flex flex-col p-6 justify-between gap-4">
        <div className="flex flex-col gap-3">
          <span className="text-xs bg-[#EEE] w-fit py-0.5 px-2 rounded-full">{DOMAINES[mission.domain] || mission.domain}</span>
          <div className="flex gap-2 text-[#666]">
            <RiBuildingFill />
            <span className="text-xs line-clamp-1">{mission.organizationName}</span>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <h2 className="font-semibold line-clamp-3 text-xl group-hover:text-[#000091] transition-colors duration-300">{mission.title}</h2>
          <span className="text-sm truncate text-[#3A3A3A]">
            {mission.remote === "full" ? "À distance" : `${mission.city} ${mission.postalCode}${mission.country !== "FR" ? `- ${iso.getName(mission.country, "fr")}` : ""}`}
          </span>
          <div className="w-full text-center mb-1">
            <span name="tracker_counter" data-id={mission._id} data-publisher={widget.fromPublisherId.toString()} data-source={widget._id.toString()} data-request={request} />
          </div>
        </div>

        <div className="flex items-center">
          <span className="text-xs text-mention-grey">{`${mission.places} ${mission.places > 1 ? "bénévoles recherchés" : "bénévole recherché"}`}</span>
        </div>
      </div>
    </a>
  );
};

export default Card;
