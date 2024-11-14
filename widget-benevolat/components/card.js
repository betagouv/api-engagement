import React from "react";
import Image from "next/image";
import iso from "i18n-iso-countries";
import { RiArrowRightSLine } from "react-icons/ri";
import { DOMAINES } from "../config";

const Card = ({ widget, mission, color, request }) => {
  if (!mission) return null;

  return (
    <a
      tabIndex={0}
      href={mission.url}
      target="_blank"
      className="border h-[500px] w-full max-w-[90%] mx-auto flex flex-col border-neutral-grey-950 rounded-xl overflow-hidden focus:outline-none focus-visible:ring focus-visible:ring-blue-800"
    >
      <div className="h-48">
        <Image
          src={mission.domainLogo}
          alt={mission.title}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
          width={500}
          height={500}
        />
      </div>
      <div className="flex-1 flex flex-col p-6 justify-between">
        <div className="h-40">
          <div className="w-full text-center mb-1">
            <span name="tracker_counter" data-id={mission._id} data-publisher={widget.fromPublisherId.toString()} data-source={widget._id.toString()} data-request={request} />
          </div>
          <h2 className="font-semibold line-clamp-3 my-2 text-xl">{mission.title}</h2>
          <span className="text-sm truncate text-default-grey">
            {mission.remote === "full" ? "À distance" : `${mission.city} ${mission.postalCode}${mission.country !== "FR" ? `- ${iso.getName(mission.country, "fr")}` : ""}`}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="uppercase font-semibold text-sm whitespace-nowrap truncate tracking-wider" style={{ color }}>
            {DOMAINES[mission.domain] || mission.domain}
          </span>
          <p className="text-mention-grey line-clamp-2 text-sm h-10">
            Par
            <span className="font-semibold ml-1">{mission.organizationName}</span>
          </p>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-xs text-mention-grey">{`${mission.places} ${mission.places > 1 ? "bénévoles recherchés" : "bénévole recherché"}`}</span>
          <RiArrowRightSLine aria-label="Accéder à la mission" className="text-3xl" style={{ color }} />
        </div>
      </div>
    </a>
  );
};

export default Card;
