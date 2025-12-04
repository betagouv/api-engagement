import iso from "i18n-iso-countries";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { RiBuildingFill } from "react-icons/ri";

import { Mission, Widget } from "types";
import { DOMAINS } from "../config";

interface CardProps {
  widget: Widget;
  mission: Mission;
  request: string | null;
  focused?: boolean;
  onKeyDown?: (e: React.KeyboardEvent<HTMLAnchorElement>) => void;
  onRef?: (ref: React.RefObject<HTMLAnchorElement | null>) => void;
}

const CardBenevolat = ({ widget, mission, request, focused = false, onKeyDown, onRef }: CardProps) => {
  const ref = useRef<HTMLAnchorElement>(null);
  const [address, setAddress] = useState("");
  const [domain, setDomain] = useState(DOMAINS[mission.domain] || DOMAINS.autre);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!mission) {
      return;
    }
    setAddress(
      mission.remote === "full"
        ? "À distance"
        : mission.addresses?.length && mission.addresses.length > 1
          ? mission.addresses.map((a) => a.city).join(", ")
          : `${mission.city} ${mission.country !== "FR" ? `- ${iso.getName(mission.country, "fr")}` : ""}`,
    );
    setDomain(DOMAINS[mission.domain] || DOMAINS.autre);
  }, [mission]);

  useEffect(() => {
    if (onRef) {
      onRef(ref);
    }
  }, [onRef]);

  if (!mission) {
    return null;
  }

  return (
    <div
      data-testid="mission-card"
      className={`${
        widget.style === "carousel" ? "w-full lg:max-w-[336px]" : "w-full"
      } relative group mx-auto flex h-full flex-col overflow-hidden border border-[#DDDDDD] bg-white hover:bg-[#F6F6F6] focus-within:outline-2 focus-within:outline-[#0a76f6] focus-within:outline-offset-2`}
    >
      <div className="h-[192px] sm:h-[200px] overflow-hidden">
        <Image
          alt=""
          src={error ? "/generique.jpeg" : mission.domainLogo || "/generique.jpeg"}
          priority={true}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110 group-focus-within:scale-110"
          width={200}
          height={200}
          onError={() => setError(true)}
        />
      </div>

      <div className="h-[276px] sm:h-[292px] flex flex-col justify-between p-6 sm:p-8 gap-4">
        <div className="flex-1 overflow-hidden">
          <span
            data-name="tracker_counter"
            data-id={mission._id}
            data-publisher={widget.fromPublisherId?.toString()}
            data-source={widget.id.toString()}
            data-request={request || ""}
          />
          <div className="w-fit flex items-center rounded-full bg-[#EEE] px-2 h-6 text-xs leading-5 mb-3">{domain.label || mission.domain}</div>
          <div className="flex items-center gap-2 text-[#666] mb-4">
            <RiBuildingFill aria-hidden="true" />
            <span className="line-clamp-1 text-xs leading-5">{mission.organizationName}</span>
          </div>
          <a
            ref={ref}
            href={mission.url}
            target="_blank"
            rel="noopener noreferrer"
            className="after:absolute after:top-0 after:left-0 after:right-0 after:bottom-0 focus:outline-none"
            tabIndex={widget.style === "carousel" ? (focused ? 0 : -1) : undefined}
            onKeyDown={onKeyDown as React.KeyboardEventHandler<HTMLAnchorElement>}
          >
            <h2 className="line-clamp-3 text-xl text-[#161616] font-semibold leading-7 transition-colors duration-300 group-hover:text-[#000091] group-focus-within:text-[#000091]">
              {mission.title}
            </h2>
          </a>
          <p className="mt-3 line-clamp-1 group-hover:line-clamp-2 group-focus-within:line-clamp-2 text-sm text-[#3A3A3A] leading-6">{address}</p>
        </div>

        <p
          className={`text-xs ${address.length > 60 ? "group-hover:hidden group-focus-within:hidden" : ""} text-[#666666] leading-5`}
        >{`${mission.places || 0} ${(mission.places || 0) > 1 ? "bénévoles recherchés" : "bénévole recherché"}`}</p>
      </div>
    </div>
  );
};

export default CardBenevolat;
