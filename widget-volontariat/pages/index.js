import * as Sentry from "@sentry/nextjs";
import iso from "i18n-iso-countries";
import isoFR from "i18n-iso-countries/langs/fr.json";
import Image from "next/image";
import { useRouter } from "next/router";
import Script from "next/script";
import React, { useEffect, useState } from "react";
iso.registerLocale(isoFR);

import { usePlausible } from "next-plausible";
import Carousel from "../components/Carousel";
import Filters from "../components/Filters";
import Grid from "../components/Grid";
import { API_URL, ENV } from "../config";
import LogoSC from "../public/images/logo-sc.svg";
import useStore from "../store";
import { calculateDistance } from "../utils";
import resizeHelper from "../utils/resizeHelper";

/**
 * Layout widget --> max-width: 1152px
 * 1 : CAROUSEL
 *  --> mobile (0->639px) height = 670px, frame = (1x1) bottom arrows
 *  --> tablet (640->767px) height = 670px, frame = (2x2) bottom arrows
 *  --> tablet (768->1023px) height = 600px, frame = (2x2) side arrows
 *  --> desktop (1024px->) height = 600px, frame = (3x3) side arrows
 * 2 : GRID
 *  --> mobile (0->639px) height = 2200px, frame = (1x1) bottom pagination
 *  --> tablet (640->1350px) height = 1350px, frame = (2x2) bottom pagination
 *  --> desktop (1024px->) height = 1050px, frame = (3x3) bottom pagination
 */

const Home = ({ widget, apiUrl, missions, total, request, environment }) => {
  console.log("apiUrl", apiUrl);
  const router = useRouter();
  const { setUrl, setColor } = useStore();
  const plausible = usePlausible();
  const [filters, setFilters] = useState({
    start: null,
    duration: null,
    schedule: [],
    minor: [],
    accessibility: [],
    domain: [],
    action: [],
    beneficiary: [],
    country: [],
    location: null,
    size: widget?.style === "carousel" ? 40 : 6,
    page: 1,
  });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (!widget) return;

    const url = new URL(location.href);
    const u = `${url.protocol}//${url.hostname}/${widget.style === "page" ? "catalogue" : "carousel"}`;
    setUrl(u);
    setColor(widget.color ? widget.color : "#71A246");
    plausible("pageview", { u });

    if (widget.location) return setFilters((f) => ({ ...f, location: widget.location }));
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const location = await fetchLocation(position.coords.latitude, position.coords.longitude);
          if (location) setFilters((f) => ({ ...f, location }));
        },
        (error) => {
          console.error("Error getting location:", error);
        },
      );
    } else {
      console.log("Geolocation is not supported by this browser.");
    }
  }, []);

  useEffect(() => {
    const cleanup = resizeHelper.setupResizeObserver();
    return () => {
      if (typeof cleanup === "function") cleanup();
    };
  }, []);

  useEffect(() => {
    if (!widget) return;

    // Timeout to prevent multiple rapid router pushes
    const timeoutId = setTimeout(() => {
      const query = {
        size: widget?.style === "carousel" ? 40 : 6,
        widget: widget._id,
        ...(router.query.notrack && { notrack: router.query.notrack }),
      };

      if (filters.accessibility && filters.accessibility.length)
        query.accessibility = filters.accessibility
          .filter((item) => item && item.value)
          .map((item) => item.value)
          .join(",");
      if (filters.action && filters.action.length)
        query.action = filters.action
          .filter((item) => item && item.value)
          .map((item) => item.value)
          .join(",");
      if (filters.beneficiary && filters.beneficiary.length)
        query.beneficiary = filters.beneficiary
          .filter((item) => item && item.value)
          .map((item) => item.value)
          .join(",");
      if (filters.country && filters.country.length)
        query.country = filters.country
          .filter((item) => item && item.value)
          .map((item) => item.value)
          .join(",");
      if (filters.domain && filters.domain.length)
        query.domain = filters.domain
          .filter((item) => item && item.value)
          .map((item) => item.value)
          .join(",");
      if (filters.duration) query.duration = filters.duration.value;
      if (filters.minor && filters.minor.length)
        query.minor = filters.minor
          .filter((item) => item && item.value)
          .map((item) => item.value)
          .join(",");
      if (filters.schedule && filters.schedule.length)
        query.schedule = filters.schedule
          .filter((item) => item && item.value)
          .map((item) => item.value)
          .join(",");
      if (filters.start) query.start = filters.start.value.toISOString();
      if (filters.page > 1) query.from = (filters.page - 1) * query.size;
      if (filters.location && filters.location.lat && filters.location.lon) {
        query.lat = filters.location.lat;
        query.lon = filters.location.lon;
        query.city = filters.location.label;
      }
      router.push({ pathname: "/", query });
    }, 100);
    return () => clearTimeout(timeoutId);
  }, [filters]);

  const fetchLocation = async (lat, lon) => {
    try {
      const url = `https://api-adresse.data.gouv.fr/reverse?lon=${lon}&lat=${lat}&limit=1`;
      const result = await fetch(url).then((response) => response.json());
      if (result.features?.length) {
        const feature = result.features[0];

        const data = {
          label: `${feature.properties.city} (${feature.properties.postcode})`,
          value: feature.properties.id,
          lat: feature.geometry.coordinates[1],
          lon: feature.geometry.coordinates[0],
          city: feature.properties.city,
          postcode: feature.properties.postcode,
        };
        setFilters({ ...filters, location: data });
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (!widget) return <div className="w-full h-full flex items-center justify-center">Erreur lors du chargement du widget</div>;

  return (
    <div
      className={`p-4 xl:px-0 ${
        widget?.style === "carousel" ? "max-h-[674px] md:max-h-[600px] md:max-w-[1200px] gap-4" : "h-[2200px] md:max-h-[1010px] md:max-w-[1200px] gap-6 lg:gap-8"
      } flex flex-col justify-start items-center mx-auto`}
    >
      <header className={`w-full space-y-4 md:space-y-8 ${widget?.style === "carousel" ? "max-w-[1056px]" : "max-w-[1200px]"}`}>
        <div className="flex flex-col gap-2 md:flex-row md:justify-between">
          <h1 className="font-bold text-[28px] leading-[36px] md:p-0">Trouver une mission de Service Civique</h1>
          <p className="text-[#666] text-[18px] leading-[28px]">{total > 1 ? `${total.toLocaleString("fr")} missions` : `${total} mission`}</p>
        </div>
        <Filters
          widget={widget}
          apiUrl={apiUrl}
          values={filters}
          onChange={(newFilters) => setFilters({ ...filters, ...newFilters })}
          disabledLocation={!!widget.location}
          show={showFilters}
          onShow={setShowFilters}
        />
      </header>

      <div className={`w-full ${showFilters ? "opacity-40 pointer-events-none" : ""}`}>
        {widget?.style === "carousel" ? (
          <Carousel widget={widget} missions={missions} total={total} request={request} />
        ) : (
          <Grid widget={widget} missions={missions} total={total} request={request} page={filters.page} handlePageChange={(page) => setFilters({ ...filters, page })} />
        )}
      </div>
      {environment === "production" && !router.query.notrack && <Script src="https://app.api-engagement.beta.gouv.fr/jstag.js" />}
      {widget._id !== "6633a45e87fb728a6da205da" && (
        <div className={`flex w-full justify-center items-center gap-4 px-4 ${showFilters ? "opacity-40 pointer-events-none" : ""}`}>
          <Image src={LogoSC} width="100" height="0" style={{ width: "53px", height: "auto" }} alt="Logo du Service Civique" />
          <p className=" text-xs text-[#666]">
            Proposé par l'Agence du Service Civique{" "}
            <a href="https://www.service-civique.gouv.fr/" target="_blank" className="underline text-[#000091] text-center">
              service-civique.gouv.fr
            </a>
          </p>
        </div>
      )}
    </div>
  );
};

export const getServerSideProps = async (context) => {
  if (!context.query.widgetName && !context.query.widget) return { props: { widget: null } };

  let widget = null;
  try {
    const q = context.query.widget ? `id=${context.query.widget}` : `name=${context.query.widgetName}`;
    const res = await fetch(`${API_URL}/iframe/widget?${q}`).then((e) => e.json());
    if (!res.ok) {
      if (res.code === "NOT_FOUND") return { props: { widget: null } };
      throw res;
    }
    widget = res.data;
  } catch (error) {
    console.error("error", error);
    Sentry.captureException(error);
    return { props: { widget: null } };
  }

  try {
    const searchParams = new URLSearchParams();

    if (context.query.domain) context.query.domain.split(",").forEach((item) => searchParams.append("domain", item));
    if (context.query.schedule) context.query.schedule.split(",").forEach((item) => searchParams.append("schedule", item));
    if (context.query.accessibility) context.query.accessibility.split(",").forEach((item) => searchParams.append("accessibility", item));
    if (context.query.minor) context.query.minor.split(",").forEach((item) => searchParams.append("minor", item));
    if (context.query.action) context.query.action.split(",").forEach((item) => searchParams.append("action", item));
    if (context.query.beneficiary) context.query.beneficiary.split(",").forEach((item) => searchParams.append("beneficiary", item));
    if (context.query.country) context.query.country.split(",").forEach((item) => searchParams.append("country", item));
    if (context.query.start) searchParams.append("start", context.query.start);
    if (context.query.duration) searchParams.append("duration", context.query.duration);
    if (context.query.size) searchParams.append("size", parseInt(context.query.size, 10));
    if (context.query.from) searchParams.append("from", parseInt(context.query.from, 10));
    if (context.query.lat && context.query.lon) {
      searchParams.append("lat", parseFloat(context.query.lat));
      searchParams.append("lon", parseFloat(context.query.lon));
      searchParams.append("city", context.query.city);
    }

    console.log("API_URL", API_URL);

    const response = await fetch(`${API_URL}/iframe/${widget._id}/search?${searchParams.toString()}`).then((res) => res.json());

    if (!response.ok) throw response;

    const query = new URLSearchParams({
      widgetId: widget._id,
      requestId: response.request,
    });

    const missions = response.data.map((h) => ({
      ...h,
      url: `${API_URL}/r/${context.query.notrack ? "notrack" : "widget"}/${h._id}?${query.toString()}`,
    }));

    if (context.query.lat && context.query.lon) {
      missions.forEach((mission) => {
        if (mission.addresses && mission.addresses.length > 1) {
          mission.addresses.sort((a, b) => {
            if (!a.location || !b.location) return 0;

            const lat = parseFloat(context.query.lat);
            const lon = parseFloat(context.query.lon);

            const distA = calculateDistance(lat, lon, a.location.lat, a.location.lon);
            const distB = calculateDistance(lat, lon, b.location.lat, b.location.lon);

            return distA - distB;
          });
        }
      });
    }

    return { props: { widget, missions, total: response.total, apiUrl: API_URL, request: response.request || null, environment: ENV } };
  } catch (error) {
    console.error(error);
    Sentry.captureException(error);
  }
  return { props: { widget, missions: [], total: 0, options: {} } };
};

export default Home;
