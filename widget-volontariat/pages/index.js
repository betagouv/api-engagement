import React, { useState, useEffect } from "react";
import Script from "next/script";
import Image from "next/image";
import * as Sentry from "@sentry/nextjs";
import iso from "i18n-iso-countries";
import isoFR from "i18n-iso-countries/langs/fr.json";
import { useRouter } from "next/router";
iso.registerLocale(isoFR);

import { ACCESSIBILITIES, ACTIONS, API_URL, BENEFICIARIES, DOMAINS, ENV, MINORS, SCHEDULES } from "../config";
import { Grid } from "../components/grid";
import { Carousel } from "../components/carousel";
import { Filters, MobileFilters } from "../components/filters";
import LogoSC from "../public/images/logo-sc.svg";

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

const Home = ({ widget, missions, options, total, request, environment }) => {
  const router = useRouter();
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
  const color = widget?.color ? widget.color : "#71A246";

  useEffect(() => {
    if (!widget) return;
    if (widget.location) return setFilters((f) => ({ ...f, location: widget.location }));

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const location = await fetchLocation(position.coords.latitude, position.coords.longitude);
          if (location) setFilters((f) => ({ ...f, location }));
        },
        (error) => {
          console.log("Error getting location:", error);
        }
      );
    } else {
      console.log("Geolocation is not supported by this browser.");
    }
  }, []);

  useEffect(() => {
    if (!widget) return;

    // Timeout to prevent multiple rapid router pushes
    const timeoutId = setTimeout(() => {
      const query = { widget: widget._id };

      if (filters.schedule && filters.schedule.length) query.schedule = JSON.stringify(filters.schedule.filter((item) => item && item.value).map((item) => item.value));
      if (filters.minor && filters.minor.length) query.minor = JSON.stringify(filters.minor.filter((item) => item && item.value).map((item) => item.value));
      if (filters.accessibility && filters.accessibility.length)
        query.accessibility = JSON.stringify(filters.accessibility.filter((item) => item && item.value).map((item) => item.value));
      if (filters.domain && filters.domain.length) query.domain = JSON.stringify(filters.domain.filter((item) => item && item.value).map((item) => item.value));
      if (filters.action && filters.action.length) query.action = JSON.stringify(filters.action.filter((item) => item && item.value).map((item) => item.value));
      if (filters.beneficiary && filters.beneficiary.length) query.beneficiary = JSON.stringify(filters.beneficiary.filter((item) => item && item.value).map((item) => item.value));
      if (filters.country && filters.country.length) query.country = JSON.stringify(filters.country.filter((item) => item && item.value).map((item) => item.value));
      if (filters.start) query.start = filters.start.value.toISOString();
      if (filters.duration) query.duration = filters.duration.value;
      if (filters.size) query.size = filters.size;
      if (filters.page > 1) query.from = (filters.page - 1) * filters.size;
      if (filters.location && filters.location.lat && filters.location.lon) {
        query.lat = filters.location.lat;
        query.lon = filters.location.lon;
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
        <div className="w-full flex md:hidden flex-col items-center gap-2 md:mb-14">
          <MobileFilters
            options={options}
            filters={filters}
            setFilters={(newFilters) => setFilters({ ...filters, ...newFilters })}
            color={color}
            disabledLocation={!!widget.location}
            showFilters={showFilters}
            setShowFilters={setShowFilters}
          />
        </div>
        <div className="hidden md:block w-full mb-8 md:mb-2">
          <Filters options={options} filters={filters} setFilters={(newFilters) => setFilters({ ...filters, ...newFilters })} color={color} disabledLocation={!!widget.location} />
        </div>
      </header>

      <div className={`w-full ${showFilters ? "opacity-40 pointer-events-none" : ""}`}>
        {widget?.style === "carousel" ? (
          <Carousel widget={widget} missions={missions} color={color} total={total} request={request} />
        ) : (
          <Grid
            widget={widget}
            missions={missions}
            color={color}
            total={total}
            request={request}
            page={filters.page}
            handlePageChange={(page) => setFilters({ ...filters, page })}
          />
        )}
      </div>
      {environment === "production" && <Script src="https://app.api-engagement.beta.gouv.fr/jstag.js" />}
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
    const response = await fetch(`${API_URL}/iframe/widget?${q}`).then((e) => e.json());
    widget = response.data;
  } catch (e) {
    console.error("error", e);
    Sentry.captureException(e);
    return { props: { widget: null } };
  }

  try {
    const searchParams = new URLSearchParams();

    if (context.query.domain) JSON.parse(context.query.domain).forEach((item) => searchParams.append("domain", item));
    if (context.query.schedule) JSON.parse(context.query.schedule).forEach((item) => searchParams.append("schedule", item));
    if (context.query.accessibility) JSON.parse(context.query.accessibility).forEach((item) => searchParams.append("accessibility", item));
    if (context.query.minor) JSON.parse(context.query.minor).forEach((item) => searchParams.append("minor", item));
    if (context.query.action) JSON.parse(context.query.action).forEach((item) => searchParams.append("action", item));
    if (context.query.beneficiary) JSON.parse(context.query.beneficiary).forEach((item) => searchParams.append("beneficiary", item));
    if (context.query.country) JSON.parse(context.query.country).forEach((item) => searchParams.append("country", item));
    if (context.query.start) searchParams.append("start", context.query.start);
    if (context.query.duration) searchParams.append("duration", context.query.duration);
    if (context.query.size) searchParams.append("size", context.query.size);
    if (context.query.from) searchParams.append("from", context.query.from);
    if (context.query.lat && context.query.lon) {
      searchParams.append("lat", context.query.lat);
      searchParams.append("lon", context.query.lon);
    }

    const response = await fetch(`${API_URL}/iframe/widget/${widget._id}/msearch?${searchParams.toString()}`).then((res) => res.json());

    if (!response.ok) throw response;
    const france = response.data.aggs.country.reduce((acc, c) => acc + (c.key === "FR" ? c.doc_count : 0), 0);
    const abroad = response.data.aggs.country.reduce((acc, c) => acc + (c.key !== "FR" ? c.doc_count : 0), 0);
    const country = [];
    country.push({ value: "FR", count: france, label: "France" });
    country.push({ value: "NOT_FR", count: abroad, label: "Etranger" });

    const newOptions = {
      schedule: response.data.aggs.schedule.map((b) => ({ value: b.key, count: b.doc_count, label: SCHEDULES[b.key] || b.key })),
      domain: response.data.aggs.domain.map((b) => ({
        value: b.key,
        count: b.doc_count,
        label: DOMAINS[b.key] ? DOMAINS[b.key].label : b.key,
      })),
      action: response.data.aggs.action.map((b) => ({ value: b.key, count: b.doc_count, label: ACTIONS[b.key] || b.key })),
      beneficiary: response.data.aggs.beneficiary.map((b) => ({ value: b.key, count: b.doc_count, label: BENEFICIARIES[b.key] || b.key })),
      accessibility: response.data.aggs.accessibility.map((b) => ({ value: b.key, count: b.doc_count, label: ACCESSIBILITIES[b.key] || b.key })),
      minor: response.data.aggs.minor.map((b) => ({ value: b.key, count: b.doc_count, label: MINORS[b.key] || b.key })),
      country,
    };

    const query = new URLSearchParams({
      widgetId: widget._id,
      requestId: response.request,
    });

    const missions = response.data.hits.map((h) => ({
      ...h,
      url: `${API_URL}/r/widget/${h._id}?${query.toString()}`,
    }));
    return { props: { widget, missions, total: response.total, options: newOptions, request: response.request, environment: ENV } };
  } catch (error) {
    console.error(error);
    Sentry.captureException(error);
  }
  return { props: { widget, missions: [], total: 0, options: {} } };
};

export default Home;
