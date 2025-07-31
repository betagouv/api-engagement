import iso from "i18n-iso-countries";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { RiBuildingFill } from "react-icons/ri";

import { DOMAINS } from "../config";

const Card = ({ widget, mission, request, onFocus = null }) => {
  const ref = useRef(null);
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
      className={`${
        widget.style === "carousel"
          ? "max-h-[420px] min-h-[420px] w-full lg:max-w-[336px] xl:max-h-[460px] xl:min-h-[460px]"
          : "max-h-[420px] min-h-[420px] w-full lg:max-h-[440px] lg:min-h-[440px]"
      } relative group mx-auto flex h-full flex-col overflow-hidden border border-[#DDDDDD] transition-shadow duration-300 hover:shadow-lg ${onFocus !== null ? "ring-2 ring-blue-600 ring-offset-0" : "focus-within:ring-2 focus-within:ring-blue-600 focus-within:ring-offset-0"}`}
    >
      <div className="max-h-[188px] min-h-[188px] overflow-hidden xl:max-h-[200px] xl:min-h-[200px]">
        <Image
          src={error ? "/generique.jpeg" : mission.domainLogo}
          alt={mission.title}
          priority={true}
          className={`h-full w-full object-cover transition-transform duration-300 ${onFocus !== null ? "scale-110" : "group-hover:scale-110 group-focus-within:scale-110"}`}
          width={500}
          height={500}
          onError={() => setError(true)}
        />
      </div>

      <div className="flex flex-1 flex-col justify-between p-6">
        <div>
          <div className="mb-4 flex flex-col gap-2">
            <span className="w-fit rounded-full bg-[#EEE] px-2 py-0.5 text-xs">{domain.label || mission.domain}</span>
            <div className="flex gap-2 text-[#666]">
              <RiBuildingFill />
              <span className="line-clamp-1 text-xs">{mission.organizationName}</span>
            </div>
          </div>

          <div className="mb-4 h-[4.5rem]">
            <a
              ref={ref}
              href={mission.url}
              target="_blank"
              className="after:absolute after:top-0 after:left-0 after:right-0 after:bottom-0 focus:outline-none"
              tabIndex={widget.style === "carousel" ? -1 : 0}
            >
              <h2
                className={`line-clamp-3 text-xl font-semibold leading-tight transition-colors duration-300 ${onFocus !== null ? "text-[#000091]" : "group-hover:text-[#000091] group-focus-within:text-[#000091]"}`}
              >
                {mission.title}
              </h2>
            </a>
          </div>

          <div className="mb-4 flex flex-col">
            <span className="mb-2 line-clamp-1 text-sm text-[#3A3A3A]">{address}</span>
            <span className="text-xs text-[#666666]">{`${mission.places} ${mission.places > 1 ? "bénévoles recherchés" : "bénévole recherché"}`}</span>
          </div>
        </div>

        <div className="mt-4 w-full text-center">
          <span name="tracker_counter" data-id={mission._id} data-publisher={widget.fromPublisherId.toString()} data-source={widget._id.toString()} data-request={request} />
        </div>
      </div>
    </div>
  );
};

export default Card;
