import * as Sentry from "@sentry/nextjs";
import iso from "i18n-iso-countries";
import isoFR from "i18n-iso-countries/langs/fr.json";
import { usePlausible } from "next-plausible";
import { useRouter } from "next/router";
import Script from "next/script";
import { useEffect, useState } from "react";
iso.registerLocale(isoFR);

import Carousel from "../components/Carousel";
import Filters from "../components/Filters";
import Grid from "../components/Grid";
import { API_URL, ENV } from "../config";
import useStore from "../store";
import { calculateDistance } from "../utils";
import resizeHelper from "../utils/resizeHelper";

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
const Home = ({ widget, missions, apiUrl, total, request, environment }) => {
  const router = useRouter();
  const { setUrl, setColor } = useStore();
  const plausible = usePlausible();
  const [filters, setFilters] = useState({
    domain: [],
    organization: [],
    department: [],
    remote: [],
    location: null,
    page: 1,
  });
  const [showFilters, setShowFilters] = useState(false);
  const color = widget?.color ? widget.color : "#71A246";

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
        }
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
        widget: widget._id,
        size: widget?.style === "carousel" ? 25 : 6,
        ...(router.query.notrack && { notrack: router.query.notrack }),
      };

      if (filters.domain?.length)
        query.domain = filters.domain
          .filter((item) => item && item.value)
          .map((item) => item.value)
          .join(",");
      if (filters.organization?.length)
        query.organization = filters.organization
          .filter((item) => item && item.value)
          .map((item) => item.value)
          .join(",");
      if (filters.department?.length)
        query.department = filters.department
          .filter((item) => item && item.value)
          .map((item) => (item.value === "" ? "none" : item.value))
          .join(",");
      if (filters.remote?.length)
        query.remote = filters.remote
          .filter((item) => item && item.value)
          .map((item) => item.value)
          .join(",");
      if (filters.page > 1) query.from = (filters.page - 1) * query.size;
      if (filters.location?.lat && filters.location?.lon) {
        query.lat = filters.location.lat;
        query.lon = filters.location.lon;
        query.city = filters.location.label;
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

  if (!widget) return <div className="flex h-full w-full items-center justify-center">Erreur lors du chargement du widget</div>;

  return (
    <div
      className={`p-2 xl:px-0 ${
        widget?.style === "carousel" ? "h-[760px] md:max-h-[686px] md:max-w-[1200px]" : "max-h-[3424px] md:max-w-[1200px] lg:max-h-[1270px]"
      } mx-auto flex flex-col items-center justify-start gap-4`}
    >
      <header className={`w-full space-y-4 md:space-y-8 ${widget?.style === "carousel" ? "max-w-[1056px]" : ""}`}>
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <h1 className="text-[28px] font-bold leading-[36px] md:p-0">Trouver une mission de bénévolat</h1>
          <p className="text-[18px] leading-[28px] text-[#666]">{total > 1 ? `${total.toLocaleString("fr")} missions` : `${total} mission`}</p>
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
      <div className={`w-full ${showFilters ? (widget?.style === "carousel" ? "hidden" : "opacity-40") : "h-auto overflow-x-hidden"}`}>
        {widget?.style === "carousel" ? (
          <Carousel widget={widget} missions={missions} total={total} request={request} />
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

    if (context.query.domain) context.query.domain.split(",").forEach((item) => searchParams.append("domain", item));
    if (context.query.organization) context.query.organization.split(",").forEach((item) => searchParams.append("organization", item));
    if (context.query.department) {
      context.query.department.split(",").forEach((item) => {
        searchParams.append("department", item === "" ? "none" : item);
      });
    }
    if (context.query.remote) context.query.remote.split(",").forEach((item) => searchParams.append("remote", item));
    if (context.query.size) searchParams.append("size", parseInt(context.query.size, 10));
    if (context.query.from) searchParams.append("from", parseInt(context.query.from, 10));
    if (context.query.lat && context.query.lon) {
      searchParams.append("lat", parseFloat(context.query.lat));
      searchParams.append("lon", parseFloat(context.query.lon));
      searchParams.append("city", context.query.city);
    }

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
