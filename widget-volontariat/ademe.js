const { DOMAINS, ACTIONS, BENEFICIARIES, ACCESSIBILITIES, MINORS, SCHEDULES } = require("./config");

const WIDGET = {
  _id: "654ba42dbe40b8a5cf9d3e45",
  name: "Environnement - Service Civique",
  style: "carousel",
  fromPublisherId: "64267e6264ded5bd0c593d99",
  type: "volontariat",
  display: "full",
  color: "#07381e",
};

// Define the maximum distance (30 km)
const MAX_DISTANCE = 25.0;

// Function to calculate the Haversine distance between two points
const haversine = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Radius of the Earth in kilometers

  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const distance = R * c;
  return distance;
};

// Function to convert degrees to radians
const toRadians = (degrees) => {
  return degrees * (Math.PI / 180);
};

const isStartingFrom = (filter, mission) => {
  return new Date(mission.startAt) > new Date(filter.value);
};

const isInDuratin = (filter, mission) => {
  return mission.duration <= filter.value;
};

const isInRange = (location, mission) => {
  if (!mission.location || !mission.location.lat || !mission.location.lon) return false;
  const distance = haversine(location.lat, location.lon, mission.location.lat, mission.location.lon);
  return distance <= MAX_DISTANCE;
};

const isMobilityAccessible = (filter, mission) => {
  const mobility = filter.find((r) => r.value === "reducedMobilityAccessible");
  if (mobility && mission.reducedMobilityAccessible === "yes") return true;
  return false;
};

const isTransportAccessible = (filter, mission) => {
  const transport = filter.find((r) => r.value === "closeToTransport");
  if (transport && mission.closeToTransport === "yes") return true;
  return false;
};

const isAccessible = (filter, mission) => {
  filter = Array.isArray(filter) ? filter.filter((f) => f !== undefined) : [];
  const mobility = filter.find((r) => r.value === "reducedMobilityAccessible");
  const transport = filter.find((r) => r.value === "closeToTransport");
  if (mobility && transport) return mission.reducedMobilityAccessible === "yes" && mission.closeToTransport === "yes";
  if (mobility && mission.reducedMobilityAccessible === "yes") return true;
  if (transport && mission.closeToTransport === "yes") return true;
  return false;
};

const isForMinor = (filter, mission) => {
  filter = Array.isArray(filter) ? filter.filter((f) => f !== undefined) : [];
  const yes = filter.find((r) => r.value === "yes");
  const no = filter.find((r) => r.value === "no");
  if (yes && mission.minor === "yes") return true;
  if (no && mission.minor === "no") return true;
  return false;
};

const hasBeneficiary = (filter, mission) => {
  filter = Array.isArray(filter) ? filter.filter((f) => f !== undefined) : [];
  if (!mission.beneficiary) return false;
  for (let i = 0; i < mission.beneficiary.length; i++) {
    if (filter.find((r) => r.value === mission.beneficiary[i])) return true;
  }
  return false;
};

const hasAction = (filter, mission) => {
  filter = Array.isArray(filter) ? filter.filter((f) => f !== undefined) : [];
  if (!mission.action) return false;
  for (let i = 0; i < mission.action.length; i++) {
    if (filter.find((r) => r.value === mission.action[i])) return true;
  }
  return false;
};

const filter = (filters, missions) => {
  const filteredMissions = missions.filter((mission) => {
    let isMatching = true;
    if (filters.location && filters.location.lat && filters.location.lon) isMatching = isMatching && isInRange(filters.location, mission);
    if (filters.start) isMatching = isMatching && isStartingFrom(filters.start, mission);
    if (filters.duration && filters.duration) isMatching = isMatching && isInDuratin(filters.duration, mission);
    if (Array.isArray(filters.schedule) && filters.schedule.length) {
      isMatching = isMatching && filters.schedule.find((b) => b?.value === mission.schedule);
    }
    if (Array.isArray(filters.domain) && filters.domain.length) {
      isMatching = isMatching && filters.domain.find((d) => d?.value === mission.domain);
    }
    if (Array.isArray(filters.action) && filters.action.length) {
      isMatching = isMatching && hasAction(filters.action, mission);
    }
    if (Array.isArray(filters.beneficiary) && filters.beneficiary.length) {
      isMatching = isMatching && hasBeneficiary(filters.beneficiary, mission);
    }
    if (Array.isArray(filters.accessibility) && filters.accessibility.length) {
      isMatching = isMatching && isAccessible(filters.accessibility, mission);
    }
    if (Array.isArray(filters.minor) && filters.minor.length) {
      isMatching = isMatching && isForMinor(filters.minor, mission);
    }
    return isMatching;
  });
  console.log("filteredMissions", filteredMissions.length);
  return filteredMissions;
};

const getAggregations = (missions, filters) => {
  let reducedMobilityAccessible = 0;
  let closeToTransport = 0;
  let minorYes = 0;
  let minorNo = 0;
  const aggregations = {
    start: null,
    duration: null,
    schedule: [],
    domain: [],
    action: [],
    beneficiary: [],
    accessibility: [],
    minor: [],
  };

  missions.forEach((mission) => {
    if (
      (filters.domain && filters.domain.includes(undefined)) ||
      (filters.action && filters.action.includes(undefined)) ||
      (filters.schedule && filters.schedule.includes(undefined)) ||
      (filters.beneficiary && filters.beneficiary.includes(undefined)) ||
      (filters.accessibility && filters.accessibility.includes(undefined)) ||
      (filters.minor && filters.minor.includes(undefined)) ||
      (filters.remote && filters.remote.includes(undefined)) ||
      filters.location === undefined
    ) {
      filters = {
        schedule: [],
        domain: [],
        action: [],
        beneficiary: [],
        accessibility: [],
        minor: [],
        remote: [],
        location: null,
      };
      return;
    }
    if (mission.schedule) {
      let isMatching = true;
      if (filters.location && filters.location.lat && filters.location.lon) isMatching = isMatching && isInRange(filters.location, mission);
      if (filters.start) isMatching = isMatching && isStartingFrom(filters.start, mission);
      if (filters.duration) isMatching = isMatching && isInDuratin(filters.duration, mission);
      if (filters.domain && filters.domain.length) isMatching = isMatching && filters.domain.find((d) => d.value === mission.domain);
      if (filters.action && filters.action.length) isMatching = isMatching && hasAction(filters.action, mission);
      if (filters.beneficiary && filters.beneficiary.length) isMatching = isMatching && hasBeneficiary(filters.beneficiary, mission);
      if (filters.accessibility && filters.accessibility.length) isMatching = isMatching && isAccessible(filters.accessibility, mission);
      if (filters.minor && filters.minor.length) isMatching = isMatching && isForMinor(filters.minor, mission);
      if (isMatching) {
        const exists = aggregations.schedule.find((a) => a.value === mission.schedule);
        if (exists) exists.count++;
        else aggregations.schedule.push({ value: mission.schedule, count: 1, label: SCHEDULES[mission.schedule] });
      }
    }
    if (mission.domain) {
      let isMatching = true;
      if (filters.location && filters.location.lat && filters.location.lon) isMatching = isMatching && isInRange(filters.location, mission);
      if (filters.start) isMatching = isMatching && isStartingFrom(filters.start, mission);
      if (filters.duration) isMatching = isMatching && isInDuratin(filters.duration, mission);
      if (filters.schedule && filters.schedule.length) isMatching = isMatching && filters.schedule.find((b) => b.value === mission.schedule);
      if (filters.action && filters.action.length) isMatching = isMatching && hasAction(filters.action, mission);
      if (filters.beneficiary && filters.beneficiary.length) isMatching = isMatching && hasBeneficiary(filters.beneficiary, mission);
      if (filters.accessibility && filters.accessibility.length) isMatching = isMatching && isAccessible(filters.accessibility, mission);
      if (filters.minor && filters.minor.length) isMatching = isMatching && isForMinor(filters.minor, mission);
      if (isMatching) {
        const exists = aggregations.domain.find((a) => a.value === mission.domain);
        if (exists) exists.count++;
        else aggregations.domain.push({ value: mission.domain, count: 1, label: DOMAINS[mission.domain] ? DOMAINS[mission.domain].label : mission.domain });
      }
    }
    if (mission.action && mission.action.length) {
      let isMatching = true;
      if (filters.location && filters.location.lat && filters.location.lon) isMatching = isMatching && isInRange(filters.location, mission);
      if (filters.start) isMatching = isMatching && isStartingFrom(filters.start, mission);
      if (filters.duration) isMatching = isMatching && isInDuratin(filters.duration, mission);
      if (filters.schedule && filters.schedule.length) isMatching = isMatching && filters.schedule.find((b) => b.value === mission.schedule);
      if (filters.domain && filters.domain.length) isMatching = isMatching && filters.domain.find((d) => d.value === mission.domain);
      if (filters.beneficiary && filters.beneficiary.length) isMatching = isMatching && hasBeneficiary(filters.beneficiary, mission);
      if (filters.accessibility && filters.accessibility.length) isMatching = isMatching && isAccessible(filters.accessibility, mission);
      if (filters.minor && filters.minor.length) isMatching = isMatching && isForMinor(filters.minor, mission);
      if (isMatching) {
        mission.action.forEach((a) => {
          const exists = aggregations.action.find((b) => b.value === a);
          if (exists) exists.count++;
          else aggregations.action.push({ value: a, count: 1, label: ACTIONS[a] });
        });
      }
    }
    if (mission.beneficiary && mission.beneficiary.length) {
      let isMatching = true;
      if (filters.location && filters.location.lat && filters.location.lon) isMatching = isMatching && isInRange(filters.location, mission);
      if (filters.start) isMatching = isMatching && isStartingFrom(filters.start, mission);
      if (filters.duration) isMatching = isMatching && isInDuratin(filters.duration, mission);
      if (filters.schedule && filters.schedule.length) isMatching = isMatching && filters.schedule.find((b) => b.value === mission.schedule);
      if (filters.domain && filters.domain.length) isMatching = isMatching && filters.domain.find((d) => d.value === mission.domain);
      if (filters.action && filters.action.length) isMatching = isMatching && hasAction(filters.action, mission);
      if (filters.accessibility && filters.accessibility.length) isMatching = isMatching && isAccessible(filters.accessibility, mission);
      if (filters.minor && filters.minor.length) isMatching = isMatching && isForMinor(filters.minor, mission);
      if (isMatching) {
        mission.beneficiary.forEach((a) => {
          const exists = aggregations.beneficiary.find((b) => b.value === a);
          if (exists) exists.count++;
          else aggregations.beneficiary.push({ value: a, count: 1, label: BENEFICIARIES[a] });
        });
      }
    }
    if (mission.reducedMobilityAccessible) {
      let isMatching = true;
      if (filters.location && filters.location.lat && filters.location.lon) isMatching = isMatching && isInRange(filters.location, mission);
      if (filters.start) isMatching = isMatching && isStartingFrom(filters.start, mission);
      if (filters.duration) isMatching = isMatching && isInDuratin(filters.duration, mission);
      if (filters.schedule && filters.schedule.length) isMatching = isMatching && filters.schedule.find((b) => b.value === mission.schedule);
      if (filters.domain && filters.domain.length) isMatching = isMatching && filters.domain.find((d) => d.value === mission.domain);
      if (filters.action && filters.action.length) isMatching = isMatching && hasAction(filters.action, mission);
      if (filters.beneficiary && filters.beneficiary.length) isMatching = isMatching && hasBeneficiary(filters.beneficiary, mission);
      if (filters.minor && filters.minor.length) isMatching = isMatching && isForMinor(filters.minor, mission);

      if (filters.accessibility && filters.accessibility.length) {
        const mobility = filters.accessibility.find((r) => r.value === "reducedMobilityAccessible");
        if (!mobility) isMatching = isMatching && isTransportAccessible(filters.accessibility, mission);
      }
      if (isMatching) {
        if (mission.reducedMobilityAccessible === "yes") reducedMobilityAccessible++;
      }
    }
    if (mission.closeToTransport) {
      let isMatching = true;
      if (filters.location && filters.location.lat && filters.location.lon) isMatching = isMatching && isInRange(filters.location, mission);
      if (filters.start) isMatching = isMatching && isStartingFrom(filters.start, mission);
      if (filters.duration) isMatching = isMatching && isInDuratin(filters.duration, mission);
      if (filters.schedule && filters.schedule.length) isMatching = isMatching && filters.schedule.find((b) => b.value === mission.schedule);
      if (filters.domain && filters.domain.length) isMatching = isMatching && filters.domain.find((d) => d.value === mission.domain);
      if (filters.action && filters.action.length) isMatching = isMatching && hasAction(filters.action, mission);
      if (filters.beneficiary && filters.beneficiary.length) isMatching = isMatching && hasBeneficiary(filters.beneficiary, mission);
      if (filters.minor && filters.minor.length) isMatching = isMatching && isForMinor(filters.minor, mission);

      if (filters.accessibility && filters.accessibility.length) {
        const transport = filters.accessibility.find((r) => r.value === "closeToTransport");
        if (!transport) isMatching = isMatching && isMobilityAccessible(filters.accessibility, mission);
      }
      if (isMatching) {
        if (mission.closeToTransport === "yes") closeToTransport++;
      }
    }
    if (mission.minor) {
      let isMatching = true;
      if (filters.location && filters.location.lat && filters.location.lon) isMatching = isMatching && isInRange(filters.location, mission);
      if (filters.start) isMatching = isMatching && isStartingFrom(filters.start, mission);
      if (filters.duration) isMatching = isMatching && isInDuratin(filters.duration, mission);
      if (filters.schedule && filters.schedule.length) isMatching = isMatching && filters.schedule.find((b) => b.value === mission.schedule);
      if (filters.domain && filters.domain.length) isMatching = isMatching && filters.domain.find((d) => d.value === mission.domain);
      if (filters.action && filters.action.length) isMatching = isMatching && hasAction(filters.action, mission);
      if (filters.beneficiary && filters.beneficiary.length) isMatching = isMatching && hasBeneficiary(filters.beneficiary, mission);
      if (filters.accessibility && filters.accessibility.length) isMatching = isMatching && isAccessible(filters.accessibility, mission);
      if (isMatching) {
        if (mission.minor === "yes") minorYes++;
        if (mission.minor === "no") minorNo++;
      }
    }
  });

  if (reducedMobilityAccessible)
    aggregations.accessibility.push({ value: "reducedMobilityAccessible", count: reducedMobilityAccessible, label: ACCESSIBILITIES.reducedMobilityAccessible });
  if (closeToTransport) aggregations.accessibility.push({ value: "closeToTransport", count: closeToTransport, label: ACCESSIBILITIES.closeToTransport });
  if (minorYes) aggregations.minor.push({ value: "yes", count: minorYes, label: MINORS.yes });
  if (minorNo) aggregations.minor.push({ value: "no", count: minorNo, label: MINORS.no });

  aggregations.schedule.sort((a, b) => b.count - a.count);
  aggregations.domain.sort((a, b) => b.count - a.count);
  aggregations.action.sort((a, b) => b.count - a.count);
  aggregations.beneficiary.sort((a, b) => b.count - a.count);
  aggregations.accessibility.sort((a, b) => b.count - a.count);
  aggregations.minor.sort((a, b) => b.count - a.count);
  return aggregations;
};

module.exports = {
  WIDGET,
  filter,
  getAggregations,
};
