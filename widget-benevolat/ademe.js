const { DOMAINES } = require("./config");

const WIDGET = {
  _id: "654baa3abe40b8a5cf9d600a",
  name: "Environnement - Bénévolat",
  style: "carousel",
  type: "benevolat",
  fromPublisherId: "64267e6264ded5bd0c593d99",
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

const isInRange = (location, mission) => {
  if (!mission.location || !mission.location.lat || !mission.location.lon) return false;
  const distance = haversine(location.lat, location.lon, mission.location.lat, mission.location.lon);
  return distance <= MAX_DISTANCE;
};

const isRemote = (filter, mission) => {
  filter = Array.isArray(filter) ? filter.filter((f) => f !== undefined) : [];
  const yes = filter.find((r) => r.value === "yes");
  const no = filter.find((r) => r.value === "no");
  if (yes && !no) return mission.remote === "full";
  if (no && !yes) return mission.remote === "no" || mission.remote === "possible";
  console.log("YES", yes);
  return true;
};

const filter = (filters, missions) => {
  const filteredMissions = missions.filter((mission) => {
    let isMatching = true;

    if (filters.location && filters.location.lat && filters.location.lon) {
      isMatching = isMatching && isInRange(filters.location, mission);
    }
    if (Array.isArray(filters.remote) && filters.remote.length) {
      isMatching = isMatching && isRemote(filters.remote, mission);
    }
    if (Array.isArray(filters.domain) && filters.domain.length) {
      isMatching = isMatching && filters.domain.some((d) => d?.value === mission.domain);
    }
    if (Array.isArray(filters.department) && filters.department.length) {
      isMatching = isMatching && filters.department.some((a) => a?.value === mission.departmentName);
    }
    if (Array.isArray(filters.schedule) && filters.schedule.length) {
      isMatching = isMatching && filters.schedule.some((b) => b?.value === mission.schedule);
    }
    if (Array.isArray(filters.organization) && filters.organization.length) {
      isMatching = isMatching && filters.organization.some((a) => a?.value === mission.organizationName);
    }

    return isMatching;
  });
  return filteredMissions;
};

const getAggregations = (missions, filters) => {
  let remote = 0;
  let presentiel = 0;
  const aggregations = {
    remote: [],
    domains: [],
    departments: [],
    organizations: [],
  };

  missions.forEach((mission) => {
    if (
      (filters.domain && filters.domain.includes(undefined)) ||
      (filters.department && filters.department.includes(undefined)) ||
      (filters.organization && filters.organization.includes(undefined)) ||
      (filters.remote && filters.remote.includes(undefined)) ||
      filters.location === undefined
    ) {
      filters = {
        domain: [],
        department: [],
        organization: [],
        remote: [],
        location: null,
      };
      return;
    }
    if (mission.remote) {
      let isMatching = true;
      if (filters.location && filters.location.lat && filters.location.lon) isMatching = isMatching && isInRange(filters.location, mission);
      if (filters.domain && filters.domain.length) isMatching = isMatching && filters.domain.find((d) => d.value === mission.domain);
      if (filters.department && filters.department.length) isMatching = isMatching && filters.department.find((a) => a.value === mission.departmentName);
      if (filters.organization && filters.organization.length) isMatching = isMatching && filters.organization.find((a) => a.value === mission.organizationName);
      if (isMatching) {
        if (mission.remote === "full") remote++;
        else presentiel++;
      }
    }

    if (mission.domain) {
      let isMatching = true;
      if (filters.location && filters.location.lat && filters.location.lon) isMatching = isMatching && isInRange(filters.location, mission);
      if (filters.remote && filters.remote.length) isMatching = isMatching && isRemote(filters.remote, mission);
      if (filters.department && filters.department.length) isMatching = isMatching && filters.department.find((a) => a.value === mission.departmentName);
      if (filters.organization && filters.organization.length) isMatching = isMatching && filters.organization.find((a) => a.value === mission.organizationName);
      if (isMatching) {
        const exists = aggregations.domains.find((a) => a.value === mission.domain);
        if (exists) exists.count++;
        else aggregations.domains.push({ value: mission.domain, count: 1, label: DOMAINES[mission.domain] || mission.domain });
      }
    }
    if (mission.departmentName) {
      let isMatching = true;
      if (filters.location && filters.location.lat && filters.location.lon) isMatching = isMatching && isInRange(filters.location, mission);
      if (filters.remote && filters.remote.length) isMatching = isMatching && isRemote(filters.remote, mission);
      if (filters.domain && filters.domain.length) isMatching = isMatching && filters.domain.find((d) => d.value === mission.domain);
      if (filters.organization && filters.organization.length) isMatching = isMatching && filters.organization.find((a) => a.value === mission.organizationName);
      if (isMatching) {
        const exists = aggregations.departments.find((a) => a.value === mission.departmentName);
        if (exists) exists.count++;
        else aggregations.departments.push({ value: mission.departmentName, count: 1, label: mission.departmentName });
      }
    }

    if (mission.organizationName) {
      let isMatching = true;
      if (filters.location && filters.location.lat && filters.location.lon) isMatching = isMatching && isInRange(filters.location, mission);
      if (filters.remote && filters.remote.length) isMatching = isMatching && isRemote(filters.remote, mission);
      if (filters.domain && filters.domain.length) isMatching = isMatching && filters.domain.find((d) => d.value === mission.domain);
      if (filters.department && filters.department.length) isMatching = isMatching && filters.department.find((a) => a.value === mission.departmentName);
      if (isMatching) {
        const exists = aggregations.organizations.find((a) => a.value === mission.organizationName);
        if (exists) exists.count++;
        else aggregations.organizations.push({ value: mission.organizationName, count: 1, label: mission.organizationName });
      }
    }
  });

  aggregations.remote.push({ value: "yes", count: remote, label: "Distance" });
  aggregations.remote.push({ value: "no", count: presentiel, label: "Présentiel" });

  // Sort by count
  aggregations.remote.sort((a, b) => b.count - a.count);
  aggregations.domains.sort((a, b) => b.count - a.count);
  aggregations.departments.sort((a, b) => b.count - a.count);
  aggregations.organizations.sort((a, b) => b.count - a.count);
  return aggregations;
};

module.exports = {
  WIDGET,
  filter,
  getAggregations,
};
