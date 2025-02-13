import React, { useState, useEffect } from "react";
import Script from "next/script";
import * as Sentry from "@sentry/nextjs";
import iso from "i18n-iso-countries";
import isoFR from "i18n-iso-countries/langs/fr.json";
import { useRouter } from "next/router";
iso.registerLocale(isoFR);

import { API_URL, DOMAINES, ENV } from "../config";
import { Carousel } from "../components/carousel";
import { Grid } from "../components/grid";
import { Filters, MobileFilters } from "../components/filters";
import { calculateDistance } from "../utils";
/**
 * Layout widget --> max-width: 1152px
 * 1 : CAROUSEL
 *  --> mobile (0->767px) height = 780px
 *  --> tablet + desktop (640->+) height = 686px
 *
 * 2 : GRID
 *  --> mobile (0->639px) height = 3424px
 *  --> tablet (640->1023px) height = 1862px
 *  --> desktop (1024px->+) height = 1314px
 */
const Home = ({ widget, missions, options, total, request, environment }) => {
  const router = useRouter();
  const [filters, setFilters] = useState({
    domain: [],
    organization: [],
    department: [],
    remote: [],
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
          console.error("Error getting location:", error);
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
      const query = {
        widget: widget._id,
        ...(router.query.notrack && { notrack: router.query.notrack }),
      };

      if (filters.domain?.length) query.domain = JSON.stringify(filters.domain.filter((item) => item && item.value).map((item) => item.value));
      if (filters.organization?.length) query.organization = JSON.stringify(filters.organization.filter((item) => item && item.value).map((item) => item.value));
      if (filters.department?.length)
        query.department = JSON.stringify(filters.department.filter((item) => item && item.value).map((item) => (item.value === "" ? "none" : item.value)));
      if (filters.remote?.length) query.remote = JSON.stringify(filters.remote.filter((item) => item && item.value).map((item) => item.value));
      if (filters.size) query.size = filters.size;
      if (filters.page > 1) query.from = (filters.page - 1) * filters.size;
      if (filters.location?.lat && filters.location?.lon) {
        query.lat = filters.location.lat;
        query.lon = filters.location.lon;
      }

      router.push({ pathname: "/", query });
    }, 100);
    return () => clearTimeout(timeoutId);
  }, [filters, widget?._id]);

  const fetchLocation = async (lat, lon) => {
    try {
      const url = `https://api-adresse.data.gouv.fr/reverse?lon=${lon}&lat=${lat}&limit=1`;
      const result = await fetch(url).then((response) => response.json());
      if (result.features?.length) {
        const feature = result.features[0];
        return {
          label: `${feature.properties.city} (${feature.properties.postcode})`,
          value: feature.properties.id,
          lat: feature.geometry.coordinates[1],
          lon: feature.geometry.coordinates[0],
          city: feature.properties.city,
          postcode: feature.properties.postcode,
        };
      }
      return null;
    } catch (e) {
      console.error("Error fetching location:", e);
      return null;
    }
  };

  if (!widget) return <div className="w-full h-full flex items-center justify-center">Erreur lors du chargement du widget</div>;

  return (
    <div
      className={`p-2 xl:px-0 ${
        widget?.style === "carousel" ? "h-[760px] md:max-h-[686px] md:max-w-[1200px]" : "max-h-[3424px] lg:max-h-[1270px] md:max-w-[1200px]"
      } flex flex-col justify-start mx-auto items-center gap-4`}
    >
      <header className={`w-full space-y-4 md:space-y-8 ${widget?.style === "carousel" ? "max-w-[1056px]" : ""}`}>
        <div className="flex flex-col gap-2 md:items-center md:flex-row md:justify-between">
          <h1 className="font-bold text-[28px] leading-[36px] md:p-0">Trouver une mission de bénévolat</h1>
          <p className="text-[#666] text-[18px] leading-[28px]">{total > 1 ? `${total.toLocaleString("fr")} missions` : `${total} mission`}</p>
        </div>
        <div className="w-full flex md:hidden flex-col items-center gap-2">
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
        <div className={`hidden md:flex m-auto items-center justify-between }`}>
          <Filters options={options} filters={filters} setFilters={(newFilters) => setFilters({ ...filters, ...newFilters })} color={color} disabledLocation={!!widget.location} />
        </div>
      </header>
      <div className={`w-full ${showFilters ? (widget?.style === "carousel" ? "hidden" : "opacity-40") : "h-auto overflow-x-hidden"}`}>
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
      {environment === "production" && !router.query.notrack && <Script src="https://app.api-engagement.beta.gouv.fr/jstag.js" />}
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

    if (context.query.domain) JSON.parse(context.query.domain).forEach((item) => searchParams.append("domain", item));
    if (context.query.organization) JSON.parse(context.query.organization).forEach((item) => searchParams.append("organization", item));
    if (context.query.department) {
      JSON.parse(context.query.department).forEach((item) => {
        searchParams.append("department", item === "" ? "none" : item);
      });
    }
    if (context.query.remote) JSON.parse(context.query.remote).forEach((item) => searchParams.append("remote", item));
    if (context.query.size) searchParams.append("size", parseInt(context.query.size, 10));
    if (context.query.from) searchParams.append("from", parseInt(context.query.from, 10));
    if (context.query.lat && context.query.lon) {
      searchParams.append("lat", parseFloat(context.query.lat));
      searchParams.append("lon", parseFloat(context.query.lon));
    }

    const response = await fetch(`${API_URL}/iframe/widget/${widget._id}/msearch?${searchParams.toString()}`).then((res) => res.json());

    if (!response.ok) throw response;
    const remote = response.data.aggs.remote.filter((b) => b.key === "full" || b.key === "possible");
    const presentiel = response.data.aggs.remote.filter((b) => b.key === "no");
    const newOptions = {
      organizations: response.data.aggs.organization.map((b) => ({ value: b.key, count: b.doc_count, label: b.key })),
      domains: response.data.aggs.domain.map((b) => ({ value: b.key, count: b.doc_count, label: DOMAINES[b.key] || b.key })),
      departments: response.data.aggs.department.map((b) => ({
        value: b.key === "" ? "none" : b.key,
        count: b.doc_count,
        label: b.key === "" ? "Non renseigné" : b.key,
      })),
      remote: [
        { value: "no", label: "Présentiel", count: presentiel.reduce((acc, b) => acc + b.doc_count, 0) },
        { value: "yes", label: "Distance", count: remote.reduce((acc, b) => acc + b.doc_count, 0) },
      ],
    };
    const query = new URLSearchParams({
      widgetId: widget._id,
      requestId: response.request,
    });

    const missions = response.data.hits.map((h) => ({
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

    return { props: { widget, missions, total: response.total, options: newOptions, request: response.request, environment: ENV } };
  } catch (error) {
    console.error(error);
    Sentry.captureException(error);
  }
  return { props: { widget, missions: [], total: 0, options: {} } };
};

export default Home;
