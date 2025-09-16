import iso from "i18n-iso-countries";
import Image from "next/image";

import { useEffect, useRef, useState } from "react";
import { RiBuildingFill, RiCalendarEventFill } from "react-icons/ri";
import { DOMAINS } from "../config";
import LogoSCE from "../public/images/logo-sce.svg";

const CardVolontariat = ({ widget, mission, request, focused = false, onKeyDown = null, onRef = null }) => {
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
    if (onRef) {
      onRef(ref);
    }
  }, [ref]);

  if (!mission) {
    return null;
  }

  return (
    <div
      data-testid="mission-card"
      className={`relative ${
        widget.style === "carousel" ? "w-full lg:max-w-[336px]" : "w-full"
      } relative border h-[290px] md:h-[310px] flex flex-col p-6 md:p-8 border-gray-900 bg-white group overflow-hidden focus-within:ring-2 focus-within:ring-[#000091] focus-within:ring-offset-0`}
    >
      <div className="flex-1">
        <div className="flex items-start mb-4">
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-2xl" style={{ background: domain.color }} data-icon={domain.icon} />

          <div className="ml-3 flex-1 min-w-0" style={{ color: domain.color }}>
            <p className="uppercase font-bold text-sm leading-5 whitespace-nowrap truncate tracking-wider">{domain.label || mission.domain}</p>
            <div className="text-[#666666] flex items-center">
              <RiBuildingFill className="text-sm flex-shrink-0" />
              <p className="ml-2 text-xs line-clamp-1">{mission.organizationName}</p>
            </div>
          </div>
        </div>

        <div className="w-full text-center">
          <span name="tracker_counter" data-id={mission._id} data-publisher={widget.fromPublisherId} data-source={widget._id} data-request={request} />
        </div>

        <a
          ref={ref}
          href={mission.url}
          target="_blank"
          className="after:absolute after:top-0 after:left-0 after:right-0 after:bottom-0 focus:outline-none"
          tabIndex={widget.style === "carousel" ? (focused ? 0 : -1) : undefined}
          aria-focused={widget.style === "carousel" ? focused : undefined}
          onKeyDown={onKeyDown}
        >
          <h2
            id={mission._id}
            className={`font-semibold h-[84px] line-clamp-3 text-xl group-hover:text-[#000091] group-focus-within:text-[#000091] transition-colors duration-300`}
          >
            {mission.title}
          </h2>
        </a>
        <p className="text-sm line-clamp-1 text-[#3A3A3A] group-hover:line-clamp-2 group-focus-within:line-clamp-2 my-3">{address}</p>

        {mission.tags?.includes("Service Civique Écologique") && <Image src={LogoSCE} height={18} alt="Service Civique Écologique" />}
      </div>

      <div className={`flex items-center min-w-[120px] text-[#666666] ${address.length > 60 ? "group-hover:hidden group-focus-within:hidden" : ""}`}>
        <RiCalendarEventFill className="h-5" />
        <p className="text-xs ml-2 whitespace-nowrap leading-5">Dès que possible</p>
      </div>

      <div className="h-[5px] w-full absolute bottom-0 left-0" style={{ backgroundColor: domain.color }} />
    </div>
  );
};

export default CardVolontariat;
