import iso from "i18n-iso-countries";
import Image from "next/image";

import { RiBuildingFill, RiCalendarEventFill } from "react-icons/ri";
import { DOMAINS } from "../config";
import LogoSCE from "../public/images/logo-sce.svg";

const Card = ({ widget, mission, request }) => {
  if (!mission) {
    return null;
  }

  const address =
    mission.remote === "full"
      ? "À distance"
      : mission.addresses?.length > 1
        ? mission.addresses.map((a) => a.city).join(", ")
        : `${mission.city} ${mission.country !== "FR" ? `- ${iso.getName(mission.country, "fr")}` : ""}`;

  const domain = DOMAINS[mission.domain] || DOMAINS.autre;
  return (
    <a
      tabIndex={0}
      href={mission.url}
      target="_blank"
      data-testid="mission-card"
      className={`relative ${
        widget.style === "carousel" ? "w-full lg:max-w-[336px]" : "w-full"
      } border min-h-[290px] max-h-[290px] md:min-h-[311px] md:max-h-[311px] flex flex-col focus:outline-none focus-visible:ring focus-visible:ring-blue-800 border-[#DDDDDD] bg-white group hover:shadow-lg transition-shadow duration-300 overflow-hidden`}
    >
      <div className="flex-1 flex flex-col p-5 gap-3">
        <div className="flex items-start min-w-0">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-2xl" style={{ background: domain.color }} data-icon={domain.icon} />
          </div>
          <div className="ml-3 flex-1 min-w-0" style={{ color: domain.color }}>
            <span className="uppercase font-bold text-sm whitespace-nowrap truncate tracking-wider block">{domain.label || mission.domain}</span>
            <div className="text-[#666666] flex items-center">
              <RiBuildingFill className="text-sm flex-shrink-0" />
              <span className="ml-2 text-xs line-clamp-1">{mission.organizationName}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 flex-grow">
          <div className="w-full text-center">
            <span name="tracker_counter" data-id={mission._id} data-publisher={widget.fromPublisherId.toString()} data-source={widget._id.toString()} data-request={request} />
          </div>

          <h2 className="font-semibold line-clamp-3 text-xl group-hover:text-[#000091] transition-colors duration-300">{mission.title}</h2>
          <span className="text-sm line-clamp-1 group-hover:line-clamp-4 text-[#3A3A3A]">{address}</span>
        </div>

        <div className="min-h-[19px] flex items-center mt-auto">
          {mission.tags?.includes("Service Civique Écologique") ? (
            <Image src={LogoSCE} width="0" height="0" style={{ width: "228px", height: "19px" }} alt="logo service civique écologique" />
          ) : (
            <div style={{ width: "228px", height: "19px" }} />
          )}
        </div>

        <div className={`flex justify-between items-center text-[#666666] ${address.length > 40 ? "group-hover:hidden" : ""}`}>
          <div className="flex items-center min-w-[120px]">
            <RiCalendarEventFill className="h-4 flex-shrink-0" />
            <span className="text-xs ml-2 whitespace-nowrap">Dès que possible</span>
          </div>
        </div>
      </div>
      <div className="h-[0.3125rem] w-full absolute bottom-0 left-0 flex-shrink-0" style={{ backgroundColor: domain.color }} />
    </a>
  );
};

export default Card;
