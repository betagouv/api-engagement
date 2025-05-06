import Image from "next/image";
import iso from "i18n-iso-countries";
import { RiBuildingFill } from "react-icons/ri";

import { DOMAINES } from "../config";
import { useState } from "react";

const Card = ({ widget, mission, request }) => {
  const [error, setError] = useState(false);
  if (!mission) return null;

  const address =
    mission.remote === "full"
      ? "à distance"
      : mission.addresses?.length > 1
        ? mission.addresses.map((a) => a.city).join(", ")
        : `${mission.city} ${mission.country !== "FR" ? `- ${iso.getName(mission.country, "fr")}` : ""}`;

  return (
    <a
      tabIndex={0}
      href={mission.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`${
        widget.style === "carousel"
          ? "w-full lg:max-w-[336px] min-h-[420px] max-h-[420px] xl:min-h-[460px] xl:max-h-[460px]"
          : "w-full lg:min-h-[440px] lg:max-h-[440px] min-h-[420px] max-h-[420px]"
      } group border h-full flex flex-col border-[#DDDDDD] overflow-hidden focus:outline-none focus-visible:ring focus-visible:ring-blue-800 hover:shadow-lg transition-shadow duration-300 mx-auto`}
    >
      <div className="min-h-[188px] max-h-[188px] xl:min-h-[200px] xl:max-h-[200px] overflow-hidden">
        <Image
          src={error ? "/generique.jpeg" : mission.domainLogo}
          alt={mission.title}
          priority={true}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
          width={500}
          height={500}
          onError={() => setError(true)}
        />
      </div>

      <div className="flex-1 flex flex-col p-6 justify-between">
        <div>
          <div className="flex flex-col gap-2 mb-4">
            <span className="text-xs bg-[#EEE] w-fit py-0.5 px-2 rounded-full">{DOMAINES[mission.domain] || mission.domain}</span>
            <div className="flex gap-2 text-[#666]">
              <RiBuildingFill />
              <span className="text-xs line-clamp-1">{mission.organizationName}</span>
            </div>
          </div>

          <div className="h-[4.5rem] mb-4">
            <h2 className="font-semibold line-clamp-3 text-xl leading-tight group-hover:text-[#000091] transition-colors duration-300">{mission.title}</h2>
          </div>

          <div className="flex flex-col mb-4">
            <span className="text-sm line-clamp-1 text-[#3A3A3A] mb-2">{address}</span>
            <span className="text-xs text-[#666666]">{`${mission.places} ${mission.places > 1 ? "bénévoles recherchés" : "bénévole recherché"}`}</span>
          </div>
        </div>

        <div className="w-full text-center mt-4">
          <span name="tracker_counter" data-id={mission._id} data-publisher={widget.fromPublisherId.toString()} data-source={widget._id.toString()} data-request={request} />
        </div>
      </div>
    </a>
  );
};

export default Card;
