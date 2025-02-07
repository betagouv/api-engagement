import Image from "next/image";
import iso from "i18n-iso-countries";
import { RiBuildingFill } from "react-icons/ri";
import { useState, useEffect } from "react";

import { DOMAINES } from "../config";

const Card = ({ widget, mission, request }) => {
  const [showAllCities, setShowAllCities] = useState(false);
  const [isTextTruncated, setIsTextTruncated] = useState(false);

  useEffect(() => {
    if (mission.addresses?.length > 1) {
      const addressesString = mission.addresses.map((address) => address.city).join(", ");
      setIsTextTruncated(addressesString.length > 50);
    }
  }, [mission.addresses]);

  if (!mission) return null;

  const formatAddresses = () => {
    const addresses = mission.addresses.map((address) => address.city).join(", ");
    return isTextTruncated
      ? mission.addresses
          .slice(0, 8)
          .map((address) => address.city)
          .join(", ") + "..."
      : addresses;
  };

  return (
    <a
      tabIndex={0}
      href={mission.url}
      target="_blank"
      onMouseEnter={() => setShowAllCities(true)}
      onMouseLeave={() => setShowAllCities(false)}
      className={`${
        widget.style === "carousel" ? "w-full lg:max-w-[336px] h-[456px] xl:min-h-[500px]" : "w-full lg:min-h-[500px] min-h-[492px]"
      } group border h-full flex flex-col border-neutral-grey-950 overflow-hidden focus:outline-none focus-visible:ring focus-visible:ring-blue-800 hover:shadow-lg transition-shadow duration-300 mx-auto`}
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

      <div className="flex-1 flex flex-col p-6">
        <div className="flex flex-col gap-3 min-h-[70px]">
          <span className="text-xs bg-[#EEE] w-fit py-0.5 px-2 rounded-full">{DOMAINES[mission.domain] || mission.domain}</span>
          <div className="flex gap-2 text-[#666]">
            <RiBuildingFill />
            <span className="text-xs line-clamp-1">{mission.organizationName}</span>
          </div>
        </div>

        <div className="flex flex-col gap-2 mt-2 overflow-visible">
          <h2 className="font-semibold text-xl group-hover:text-[#000091] duration-500 line-clamp-2">{mission.title}</h2>
          {mission.addresses?.length > 1 ? (
            <div className="relative h-5">
              <div className={`w-full absolute transition-all duration-500 ${showAllCities ? "opacity-0" : "opacity-100"}`}>
                <span className="text-sm truncate text-[#3A3A3A] block">{mission.addresses.map((address) => address.city).join(", ")}</span>
              </div>
              <div className={`w-full absolute transition-all duration-500 ${showAllCities ? "opacity-100" : "opacity-0"}`}>
                <span className="text-sm text-[#3A3A3A] block">{formatAddresses()}</span>
              </div>
            </div>
          ) : (
            <span className="text-sm truncate text-[#3A3A3A]">
              {mission.remote === "full" ? "À distance" : `${mission.city} ${mission.postalCode}${mission.country !== "FR" ? `- ${iso.getName(mission.country, "fr")}` : ""}`}
            </span>
          )}
        </div>

        <div className="flex flex-col gap-2 mt-auto">
          <div className="w-full text-center">
            <span name="tracker_counter" data-id={mission._id} data-publisher={widget.fromPublisherId.toString()} data-source={widget._id.toString()} data-request={request} />
          </div>
          <div
            className={`flex items-center transition-opacity duration-500 ${!mission.addresses?.length > 1 || !isTextTruncated || !showAllCities ? "opacity-100" : "opacity-0"}`}
          >
            <span className="text-xs text-mention-grey">{`${mission.places} ${mission.places > 1 ? "bénévoles recherchés" : "bénévole recherché"}`}</span>
          </div>
        </div>
      </div>
    </a>
  );
};

export default Card;
