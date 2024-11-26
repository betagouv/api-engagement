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
      className="border min-h-[500px] w-full mx-auto flex flex-col border-neutral-grey-950 overflow-hidden focus:outline-none focus-visible:ring focus-visible:ring-blue-800"
    >
      <div className="h-[200px]">
        <Image src={mission.domainLogo} alt={mission.title} priority={true} className="w-full h-full object-cover" width={500} height={500} />
      </div>

      <div className="flex-1 flex flex-col p-6 justify-between">
        <div className="flex flex-col gap-3">
          <span className="text-xs bg-[#EEE] w-fit py-0.5 px-2 rounded-full">{DOMAINES[mission.domain] || mission.domain}</span>
          <div className="flex gap-2 text-[#666]">
            <RiBuildingFill />
            <span className="text-xs">{mission.organizationName}</span>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <h2 className="font-semibold line-clamp-3 text-xl">{mission.title}</h2>
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
