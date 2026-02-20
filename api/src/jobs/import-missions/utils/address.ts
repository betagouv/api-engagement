import { DEPARTMENTS } from "@/constants/departments";
import { MissionAddress } from "@/types/mission";
import { ImportedMission, MissionXML } from "@/jobs/import-missions/types";

const parseString = (value: string | undefined) => {
  if (!value) {
    return "";
  }
  return String(value);
};

const formatPostalCode = (postalCode: string) => {
  if (!postalCode) {
    return "";
  }
  const postalCodeString = postalCode;
  if (postalCodeString.length === 5) {
    return postalCodeString;
  }
  if (postalCodeString.length === 4) {
    return "0" + postalCodeString;
  }
  if (postalCodeString.length === 3) {
    return "00" + postalCodeString;
  }
  if (postalCodeString.length === 2) {
    return "000" + postalCodeString;
  }
  if (postalCodeString.length === 1) {
    return "0000" + postalCodeString;
  }
  return "";
};

const getDepartmentCode = (departmentCode: string, postalCode: string) => {
  if (departmentCode && DEPARTMENTS[departmentCode]) {
    return departmentCode;
  }

  let code;
  if (postalCode.length === 5) {
    code = postalCode.slice(0, 2);
  } else if (postalCode.length === 4) {
    code = postalCode.slice(0, 1);
  } else {
    return "";
  }
  if (code === "97" || code === "98") {
    code = postalCode.slice(0, 3);
  }
  if (DEPARTMENTS[code]) {
    return code;
  } else {
    return "";
  }
};

const getDepartement = (code?: string) => (code && DEPARTMENTS[code] && DEPARTMENTS[code][0]) || "";
const getRegion = (code?: string) => (code && DEPARTMENTS[code] && DEPARTMENTS[code][1]) || "";

export const getAddress = (mission: ImportedMission, missionXML: MissionXML) => {
  mission.country = parseString(missionXML.country || missionXML.countryCode);
  if (mission.country === "France") {
    mission.country = "FR";
  }

  // Dirty because reading a doc is too boring for some people
  let location = undefined;
  if (missionXML.lonLat) {
    // Service Civique use lonLat as field and have this format [lat, lon] --> stupid but eh...
    const lat = parseFloat(missionXML.lonLat.split(",")[0]) || undefined;
    const lon = parseFloat(missionXML.lonLat.split(",")[1]) || undefined;
    if (lat && lon) {
      location = { lon, lat };
    }
  }
  if (missionXML.lonlat) {
    const a = parseFloat(missionXML.lonlat.split(",")[0]) || undefined; // supposed lon
    const b = parseFloat(missionXML.lonlat.split(",")[1]) || undefined; // supposed lat
    if (a && b) {
      location = {} as { lon: number; lat: number };
      const little = a < b ? a : b;
      const big = a > b ? a : b;
      if (4.3 < little && little < 8) {
        // France
        location.lon = little;
        location.lat = big;
      } else if (b < -90 || 90 < b) {
        // lat should be betweem -90 and 90, if outside, consider its the lon
        location.lon = b;
        location.lat = a;
      } else {
        location.lon = a;
        location.lat = b;
      }
    }
  } else if (missionXML.location && missionXML.location.lon && missionXML.location.lat) {
    location = missionXML.location;
  }
  if (location && location.lon && location.lat && -90 <= location.lat && location.lat <= 90 && -180 <= location.lon && location.lon <= 180) {
    mission.location = location;
    mission.geolocStatus = "ENRICHED_BY_PUBLISHER";
  }

  mission.address = parseString(missionXML.address || missionXML.adresse);
  mission.city = parseString(missionXML.city);

  if (mission.country !== "FR") {
    mission.postalCode = parseString(missionXML.postalCode);
    mission.departmentCode = parseString(missionXML.departmentCode);
    mission.departmentName = parseString(missionXML.departmentName);
    mission.region = parseString(missionXML.region);
  } else {
    mission.postalCode = formatPostalCode(parseString(missionXML.postalCode));
    if (mission.postalCode) {
      const departmentCode = getDepartmentCode(missionXML.departmentCode, mission.postalCode.toString());
      mission.departmentCode = departmentCode;
      mission.departmentName = getDepartement(departmentCode) || parseString(missionXML.departmentName);
      mission.region = getRegion(departmentCode) || parseString(missionXML.region);
    } else {
      mission.departmentCode = parseString(missionXML.departmentCode);
      mission.departmentName = parseString(missionXML.departmentName);
      mission.region = parseString(missionXML.region);
    }
  }

  if (mission.address || mission.city || mission.postalCode || mission.country) {
    mission.addresses = [
      {
        street: mission.address,
        city: mission.city,
        postalCode: mission.postalCode,
        departmentName: mission.departmentName,
        departmentCode: mission.departmentCode,
        region: mission.region,
        country: mission.country,
        location: mission.location || null,
        geoPoint: mission.location
          ? {
              type: "Point",
              coordinates: [mission.location.lon, mission.location.lat],
            }
          : null,
        geolocStatus: mission.geolocStatus || "NO_DATA",
      },
    ];
  } else {
    mission.addresses = [];
  }
};

export const getAddresses = (mission: ImportedMission, missionXML: MissionXML) => {
  mission.addresses = [];

  for (const address of missionXML.addresses) {
    const addressItem: MissionAddress = {
      street: parseString(address.street),
      city: parseString(address.city),
      postalCode: "",
      departmentName: "",
      departmentCode: "",
      region: "",
      country: parseString(address.country),
      location: address.location
        ? {
            lon: address.location.lon,
            lat: address.location.lat,
          }
        : null,
      geoPoint: null,
      geolocStatus: address.location ? "ENRICHED_BY_PUBLISHER" : "SHOULD_ENRICH",
    };

    if (addressItem.location && addressItem.location.lon && addressItem.location.lat) {
      addressItem.geoPoint = {
        type: "Point",
        coordinates: [addressItem.location.lon, addressItem.location.lat],
      };
    }

    if (addressItem.country === "France") {
      addressItem.country = "FR";
    }

    if (addressItem.country !== "FR") {
      addressItem.postalCode = parseString(address.postalCode);
      addressItem.departmentCode = parseString(address.departmentCode);
      addressItem.departmentName = parseString(address.departmentName);
      addressItem.region = parseString(address.region);
    } else {
      addressItem.postalCode = formatPostalCode(parseString(address.postalCode));
      if (addressItem.postalCode) {
        const departmentCode = getDepartmentCode(address.departmentCode, addressItem.postalCode.toString());
        addressItem.departmentCode = departmentCode;
        addressItem.departmentName = getDepartement(departmentCode) || parseString(address.departmentName);
        addressItem.region = getRegion(departmentCode) || parseString(address.region);
      } else {
        addressItem.departmentCode = parseString(address.departmentCode);
        addressItem.departmentName = parseString(address.departmentName);
        addressItem.region = parseString(address.region);
      }
    }
    mission.addresses.push(addressItem);
  }

  // add to old fields
  mission.address = mission.addresses[0].street || "";
  mission.city = mission.addresses[0].city || "";
  mission.country = mission.addresses[0].country || "";
  mission.postalCode = mission.addresses[0].postalCode || "";
  mission.departmentCode = mission.addresses[0].departmentCode || "";
  mission.departmentName = mission.addresses[0].departmentName || "";
  mission.region = mission.addresses[0].region || "";
  mission.location = mission.addresses[0].location
    ? {
        lat: Number(mission.addresses[0].location.lat),
        lon: Number(mission.addresses[0].location.lon),
      }
    : null;
  mission.geolocStatus = mission.addresses[0].geolocStatus || "NO_DATA";
};
