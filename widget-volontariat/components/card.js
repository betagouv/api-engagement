import React from "react";
import Image from "next/image";
import iso from "i18n-iso-countries";

import { RiBuildingFill, RiCalendarEventFill } from "react-icons/ri";
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
      className={`${
        widget.style === "carousel" ? "md:max-w-[336px]" : "w-full"
      } border h-full mx-auto flex flex-col focus:outline-none focus-visible:ring focus-visible:ring-blue-800 border-grey-400 bg-white overflow-hidden group hover:shadow-lg transition-shadow duration-300`}
    >
      <div className="flex-1 flex flex-col p-8 gap-3 justify-between">
        <div className="flex items-center">
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

        <div className="h-[120px]">
          <div className="w-full text-center">
            <span name="tracker_counter" data-id={mission._id} data-publisher={widget.fromPublisherId.toString()} data-source={widget._id.toString()} data-request={request} />
          </div>

          <h2 className="font-semibold line-clamp-3 h-[84px] my-2 text-xl group-hover:text-[#000091] transition-colors duration-300">{mission.title}</h2>
          <div className="h-[20px]">
            <span className="text-sm truncate text-default-grey block">
              {mission.remote === "full" ? "À distance" : `${mission.city} ${mission.postalCode}${mission.country !== "FR" ? ` - ${iso.getName(mission.country, "fr")}` : ""}`}
            </span>
          </div>
        </div>

        <div className="flex items-center">
          {mission.tags?.includes("Service Civique Écologique") ? (
            <Image src={LogoSCE} width="0" height="0" style={{ width: "228px", height: "19px" }} alt="logo service civique écologique" />
          ) : (
            <div style={{ width: "228px", height: "19px" }} />
          )}
        </div>

        <div className="flex justify-between items-center text-mention-grey">
          <div className="flex items-center">
            <RiCalendarEventFill className="h-4" />
            <span className="text-xs ml-2">Dès que possible</span>
          </div>
        </div>
      </div>

      <div className="h-[0.3125rem] w-full" style={{ backgroundColor: domain.color }} />
    </a>
  );
};

export default Card;
