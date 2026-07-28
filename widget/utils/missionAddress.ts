import iso from "i18n-iso-countries";

import { Mission } from "@/types";

export const getMissionAddressLabel = (mission: Mission): string => {
  if (mission.remote === "full") {
    return "À distance";
  }
  if (mission.remote === "local") {
    return "Près de chez moi";
  }

  if (mission.addresses && mission.addresses.length > 1) {
    const cities = mission.addresses.map((address) => address.city).filter(Boolean);
    if (cities.length) {
      return cities.join(", ");
    }
  }

  const city = mission.city?.trim();
  if (!city) {
    return "Lieu non précisé";
  }

  const countryName = mission.country && mission.country !== "FR" ? iso.getName(mission.country, "fr") : null;
  return countryName ? `${city} - ${countryName}` : city;
};
