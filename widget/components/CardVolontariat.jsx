import iso from "i18n-iso-countries";
import Image from "next/image";

import { useEffect, useRef, useState } from "react";
import { RiBuildingFill, RiCalendarEventFill } from "react-icons/ri";
import { DOMAINS } from "../config";
import LogoSCE from "../public/images/logo-sce.svg";

const CardVolontariat = ({ widget, mission, request, onFocus = null }) => {
  const ref = useRef(null);
  const [address, setAddress] = useState("");
  const [domain, setDomain] = useState(DOMAINS[mission.domain] || DOMAINS.autre);

  useEffect(() => {
    if (!mission) {
      return;
    }
    setAddress(
      mission.remote === "full"
        ? "À distance"
        : mission.addresses?.length > 1
          ? mission.addresses.map((a) => a.city).join(", ")
          : `${mission.city} ${mission.country !== "FR" ? `- ${iso.getName(mission.country, "fr")}` : ""}`,
    );
    setDomain(DOMAINS[mission.domain] || DOMAINS.autre);
  }, [mission]);

  useEffect(() => {
    if (onFocus) {
      onFocus(ref);
    }
  }, [onFocus]);

  if (!mission) {
    return null;
  }

  return (
    <div
      data-testid="mission-card"
      className={`relative ${
        widget.style === "carousel" ? "w-full lg:max-w-[336px]" : "w-full"
      } relative border min-h-[290px] max-h-[290px] md:min-h-[311px] md:max-h-[311px] flex flex-col border-[#DDDDDD] bg-white group overflow-hidden ${onFocus !== null ? "ring-2 ring-[#000091] ring-offset-0" : "focus-within:ring-2 focus-within:ring-[#000091] focus-within:ring-offset-0"}`}
    >
      <div className="flex-1 flex flex-col p-5 gap-3">
        <div className="flex items-start min-w-0">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-2xl" style={{ background: domain.color }} data-icon={domain.icon} />
          </div>
          <div className="ml-3 flex-1 min-w-0" style={{ color: domain.color }}>
            <p className="uppercase font-bold text-sm whitespace-nowrap truncate tracking-wider block">{domain.label || mission.domain}</p>
            <div className="text-[#666666] flex items-center">
              <RiBuildingFill className="text-sm flex-shrink-0" />
              <p className="ml-2 text-xs line-clamp-1">{mission.organizationName}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 flex-grow">
          <div className="w-full text-center">
            <span name="tracker_counter" data-id={mission._id} data-publisher={widget.fromPublisherId} data-source={widget._id} data-request={request} />
          </div>

          <a
            ref={ref}
            href={mission.url}
            target="_blank"
            className="after:absolute after:top-0 after:left-0 after:right-0 after:bottom-0 focus:outline-none"
            tabIndex={widget.style === "carousel" ? -1 : 0}
          >
            <h2
              id={mission._id}
              className={`font-semibold line-clamp-3 text-xl ${onFocus !== null ? "text-[#000091]" : "group-hover:text-[#000091] group-focus-within:text-[#000091]"} transition-colors duration-300`}
            >
              {mission.title}
            </h2>
          </a>
          <p className={`text-sm line-clamp-1 text-[#3A3A3A] ${onFocus !== null ? "line-clamp-4" : "group-hover:line-clamp-4 group-focus-within:line-clamp-4"}`}>{address}</p>
        </div>

        <div className="min-h-[19px] flex items-center mt-auto">
          {mission.tags?.includes("Service Civique Écologique") ? (
            <Image src={LogoSCE} width="0" height="0" style={{ width: "228px", height: "19px" }} alt="logo service civique écologique" />
          ) : (
            <div style={{ width: "228px", height: "19px" }} />
          )}
        </div>

        <div
          className={`flex justify-between items-center text-[#666666] ${address.length > 40 ? `${onFocus !== null ? "hidden" : "group-hover:hidden group-focus-within:hidden"}` : ""}`}
        >
          <div className="flex items-center min-w-[120px]">
            <RiCalendarEventFill className="h-4 flex-shrink-0" />
            <p className="text-xs ml-2 whitespace-nowrap">Dès que possible</p>
          </div>
        </div>
      </div>
      <div className="h-[0.3125rem] w-full absolute bottom-0 left-0 flex-shrink-0" style={{ backgroundColor: domain.color }} />
    </div>
  );
};

export default CardVolontariat;
