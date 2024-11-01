import React from "react";
import Image from "next/image";
import iso from "i18n-iso-countries";

import { RiArrowRightLine, RiBuildingFill, RiCalendarEventFill } from "react-icons/ri";
import { DOMAINS } from "../config";
import LogoSCE from "../public/images/logo-sce.svg";

const Card = ({ widget, mission, request }) => {
  if (!mission) return null;

  const domain = DOMAINS[mission.domain] || DOMAINS.autre;
  return (
    <a
      tabIndex={0}
      href={mission.url}
      target="_blank"
      className="border h-[311px] w-full max-w-[90%] md:max-w-full flex flex-col focus:outline-none focus-visible:ring focus-visible:ring-blue-800 border-grey-400 bg-white rounded-xl overflow-hidden mx-auto"
    >
      <div className="flex-1 flex flex-col p-6 justify-between">
        <div className="h-32">
          <div className="w-full text-center">
            <span name="tracker_counter" data-id={mission._id} data-publisher={widget.fromPublisherId.toString()} data-source={widget._id.toString()} data-request={request} />
          </div>

          <h2 className="font-semibold line-clamp-3 my-2 text-xl">{mission.title}</h2>
          <span className="text-sm truncate text-default-grey">
            {mission.remote === "full" ? "À distance" : `${mission.city} ${mission.postalCode}${mission.country !== "FR" ? ` - ${iso.getName(mission.country, "fr")}` : ""}`}
          </span>
        </div>
        <div className="mb-2 flex items-center">
          {mission.tags?.includes("Service Civique Écologique") ? (
            <Image src={LogoSCE} width="0" height="0" style={{ width: "228px", height: "19px" }} alt="logo service civique écologique" />
          ) : (
            ""
          )}
        </div>
        <div className="mb-1 flex items-center">
          <div>
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-2xl" style={{ background: domain.color }} data-icon={domain.icon} />
          </div>
          <div className="ml-3 flex-1 truncate" style={{ color: domain.color }}>
            <span className="uppercase font-bold text-sm whitespace-nowrap tracking-wider">{domain.label || mission.domain}</span>
            <div className="text-mention-grey flex items-center">
              <div>
                <RiBuildingFill className="text-sm" />
              </div>
              <span className="ml-2 text-xs line-clamp-2">{mission.organizationName}</span>
            </div>
          </div>
        </div>
        <div className="flex justify-between items-center text-mention-grey">
          <div className="flex items-center">
            <RiCalendarEventFill className="h-4" />
            <span className="text-xs ml-2">Dès que possible</span>
          </div>
          <RiArrowRightLine aria-label="Accéder à la mission" className="text-3xl" />
        </div>
      </div>
      <div className="h-[0.3125rem] w-full" style={{ backgroundColor: domain.color }} />
    </a>
  );
};

export default Card;
