import Image from "next/image";
import iso from "i18n-iso-countries";
import { RiBuildingFill } from "react-icons/ri";

import { DOMAINES } from "../config";

const Card = ({ widget, mission, request }) => {
  if (!mission) return null;

  const addressCharLength = (
    mission.remote === "full"
      ? "À distance"
      : mission.addresses?.length > 1
      ? mission.addresses.map((a) => a.city).join(", ")
      : `${mission.city} ${mission.postalCode}${mission.country !== "FR" ? `- ${iso.getName(mission.country, "fr")}` : ""}`
  ).length;

  const showAddresses = addressCharLength > 60;

  return (
    <a
      tabIndex={0}
      href={mission.url}
      target="_blank"
      className={`${
        widget.style === "carousel" ? "w-full lg:max-w-[336px] min-h-[456px] max-h-[456px] xl:min-h-[500px]" : "w-full lg:min-h-[500px] min-h-[492px]"
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

      <div className="flex-1 flex flex-col p-6 gap-5">
        <div className="flex flex-col gap-3">
          <span className="text-xs bg-[#EEE] w-fit py-0.5 px-2 rounded-full">{DOMAINES[mission.domain] || mission.domain}</span>
          <div className="flex gap-2 text-[#666]">
            <RiBuildingFill />
            <span className="text-xs line-clamp-1">{mission.organizationName}</span>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <h2 className="font-semibold line-clamp-2 text-xl group-hover:text-[#000091] transition-colors duration-300">{mission.title}</h2>
          <span className="text-sm line-clamp-1 group-hover:line-clamp-5 text-[#3A3A3A]">
            {mission.remote === "full"
              ? "À distance"
              : mission.addresses?.length > 1
              ? mission.addresses.map((a) => a.city).join(", ")
              : `${mission.city} ${mission.postalCode}${mission.country !== "FR" ? `- ${iso.getName(mission.country, "fr")}` : ""}`}
          </span>
          <div className="w-full text-center mb-1">
            <span name="tracker_counter" data-id={mission._id} data-publisher={widget.fromPublisherId.toString()} data-source={widget._id.toString()} data-request={request} />
          </div>
        </div>

        <div className={`mt-auto flex items-center ${showAddresses ? "group-hover:hidden" : ""}`}>
          <span className="text-xs text-mention-grey">{`${mission.places} ${mission.places > 1 ? "bénévoles recherchés" : "bénévole recherché"}`}</span>
        </div>
      </div>
    </a>
  );
};

export default Card;
