import * as Sentry from "@sentry/nextjs";
import iso from "i18n-iso-countries";
import isoFR from "i18n-iso-countries/langs/fr.json";
import Image from "next/image";
import { useRouter } from "next/router";
import Script from "next/script";
import { useEffect, useState } from "react";
iso.registerLocale(isoFR);

import { usePlausible } from "next-plausible";
import Carousel from "../components/Carousel";
import Filters from "../components/Filters";
import Grid from "../components/Grid";
import { API_URL, ENV } from "../config";
import LogoSC from "../public/images/logo-sc.svg";
import resizeHelper from "../utils/resizeHelper";
import useStore from "../utils/store";
import { calculateDistance } from "../utils/utils";

const getInitialFilters = (widget) => {
  const isBenevolat = widget?.type === "benevolat";

  return {
    domain: [],
    location: null,
    page: 1,
    size: widget?.style === "carousel" ? (isBenevolat ? 25 : 40) : 6,
    ...(isBenevolat
      ? {
          // Benevolat filters
          organization: [],
          department: [],
          remote: [],
        }
      : {
          // Volontariat filters
          start: null,
          duration: null,
          schedule: [],
          minor: [],
          accessibility: [],
          action: [],
          beneficiary: [],
          country: [],
        }),
  };
};

const Home = ({ widget, apiUrl, missions, total, request, environment }) => {
  const isBenevolat = widget?.type === "benevolat";
  const color = widget?.color ? widget.color : "#71A246";

  const router = useRouter();
  const plausible = usePlausible();

  const { setUrl, setColor } = useStore();
  const [filters, setFilters] = useState(() => getInitialFilters(widget));
  const [showFilters, setShowFilters] = useState(false);

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

  useEffect(() => {
    if (!widget) {
      return;
    }

    const url = new URL(location.href);
    const u = `${url.protocol}//${url.hostname}/${widget.style === "page" ? "catalogue" : "carousel"}`;
    setUrl(u);
    setColor(color);
    plausible("pageview", { u });

    if (widget.location) {
      setFilters((f) => ({ ...f, location: widget.location }));
      return;
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const location = await fetchLocation(position.coords.latitude, position.coords.longitude);
          if (location) {
            setFilters((f) => ({ ...f, location }));
          }
        },
        (error) => {
          console.error("Error getting location:", error);
        },
      );
    } else {
      console.log("Geolocation is not supported by this browser.");
    }
  }, [widget?._id]);

  useEffect(() => {
    const cleanup = resizeHelper.setupResizeObserver();
    return () => {
      if (typeof cleanup === "function") {
        cleanup();
      }
    };
  }, []);

  useEffect(() => {
    if (!widget) {
      return;
    }

    const timeoutId = setTimeout(() => {
      const query = {
        widget: widget._id,
        size: filters.size,
        ...(router.query.notrack && { notrack: router.query.notrack }),
      };

      if (isBenevolat) {
        if (filters.domain?.length) {
          query.domain = filters.domain.map((item) => item.value).join(",");
        }
        if (filters.organization?.length) {
          query.organization = filters.organization.map((item) => item.value).join(",");
        }
        if (filters.department?.length) {
          query.department = filters.department.map((item) => (item.value === "" ? "none" : item.value)).join(",");
        }
        if (filters.remote?.length) {
          query.remote = filters.remote.map((item) => item.value).join(",");
        }
      } else {
        if (filters.accessibility?.length) {
          query.accessibility = filters.accessibility.map((item) => item.value).join(",");
        }
        if (filters.action?.length) {
          query.action = filters.action.map((item) => item.value).join(",");
        }
        if (filters.beneficiary?.length) {
          query.beneficiary = filters.beneficiary.map((item) => item.value).join(",");
        }
        if (filters.country?.length) {
          query.country = filters.country.map((item) => item.value).join(",");
        }
        if (filters.domain?.length) {
          query.domain = filters.domain.map((item) => item.value).join(",");
        }
        if (filters.duration) {
          query.duration = filters.duration.value;
        }
        if (filters.minor?.length) {
          query.minor = filters.minor.map((item) => item.value).join(",");
        }
        if (filters.schedule?.length) {
          query.schedule = filters.schedule.map((item) => item.value).join(",");
        }
        if (filters.start) {
          query.start = filters.start.value.toISOString();
        }
      }

      if (filters.page > 1) {
        query.from = (filters.page - 1) * filters.size;
      }
      if (filters.location?.lat && filters.location?.lon) {
        query.lat = filters.location.lat;
        query.lon = filters.location.lon;
        query.city = filters.location.label;
      }

      router.push({ pathname: "/", query }, undefined);
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [filters, widget?._id]);

  if (!widget) {
    return <div className="flex h-full w-full items-center justify-center">Erreur lors du chargement du widget</div>;
  }

  return (
    <>
      <header role="banner" className={`w-full space-y-4 p-4 md:space-y-8 ${widget?.style === "carousel" ? "max-w-[1056px]" : ""}`}>
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <h1 className="text-[28px] font-bold leading-[36px] md:p-0">{isBenevolat ? "Trouver une mission de bénévolat" : "Trouver une mission de Service Civique"}</h1>
          <p className="text-[18px] leading-[28px] text-[#666]">{total > 1 ? `${total.toLocaleString("fr")} missions` : `${total} mission`}</p>
        </div>
        <Filters
          widget={widget}
          apiUrl={apiUrl}
          values={filters}
          onChange={(newFilters) => setFilters({ ...filters, ...newFilters, page: 1 })}
          disabledLocation={!!widget.location}
          show={showFilters}
          onShow={setShowFilters}
        />
      </header>
      <main role="main" className={`w-full ${showFilters ? (widget?.style === "carousel" ? "hidden" : "opacity-40 pointer-events-none") : "h-auto overflow-x-hidden"}`}>
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
      </main>
      {environment === "production" && !router.query.notrack && <Script src="https://app.api-engagement.beta.gouv.fr/jstag.js" />}
      {!isBenevolat && (
        <div className={`flex w-full justify-center items-center gap-4 px-4 ${showFilters ? "opacity-40 pointer-events-none" : ""}`}>
          <Image src={LogoSC} width="100" height="0" style={{ width: "53px", height: "auto" }} alt="Logo du Service Civique" />
          <p className=" text-xs text-[#666]">
            Proposé par l'Agence du Service Civique{" "}
            <a href="https://www.service-civique.gouv.fr/" target="_blank" rel="noopener noreferrer" className="underline text-[#000091] text-center">
              service-civique.gouv.fr
            </a>
          </p>
        </div>
      )}
    </>
  );
};

export const getServerSideProps = async (context) => {
  if (!context.query.widgetName && !context.query.widget) {
    return { props: { widget: null } };
  }

  let widget = null;
  try {
    const q = context.query.widget ? `id=${context.query.widget}` : `name=${context.query.widgetName}`;
    const res = await fetch(`${API_URL}/iframe/widget?${q}`).then((e) => e.json());
    if (!res.ok) {
      if (res.code === "NOT_FOUND") {
        return { props: { widget: null } };
      }
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
    const isBenevolat = widget.type === "benevolat";

    if (isBenevolat) {
      if (context.query.domain) {
        context.query.domain.split(",").forEach((item) => searchParams.append("domain", item));
      }
      if (context.query.organization) {
        context.query.organization.split(",").forEach((item) => searchParams.append("organization", item));
      }
      if (context.query.department) {
        context.query.department.split(",").forEach((item) => {
          searchParams.append("department", item === "" ? "none" : item);
        });
      }
      if (context.query.remote) {
        context.query.remote.split(",").forEach((item) => searchParams.append("remote", item));
      }
    } else {
      if (context.query.domain) {
        context.query.domain.split(",").forEach((item) => searchParams.append("domain", item));
      }
      if (context.query.schedule) {
        context.query.schedule.split(",").forEach((item) => searchParams.append("schedule", item));
      }
      if (context.query.accessibility) {
        context.query.accessibility.split(",").forEach((item) => searchParams.append("accessibility", item));
      }
      if (context.query.minor) {
        context.query.minor.split(",").forEach((item) => searchParams.append("minor", item));
      }
      if (context.query.action) {
        context.query.action.split(",").forEach((item) => searchParams.append("action", item));
      }
      if (context.query.beneficiary) {
        context.query.beneficiary.split(",").forEach((item) => searchParams.append("beneficiary", item));
      }
      if (context.query.country) {
        context.query.country.split(",").forEach((item) => searchParams.append("country", item));
      }
      if (context.query.start) {
        searchParams.append("start", context.query.start);
      }
      if (context.query.duration) {
        searchParams.append("duration", context.query.duration);
      }
    }

    if (context.query.size) {
      searchParams.append("size", parseInt(context.query.size, 10));
    }
    if (context.query.from) {
      searchParams.append("from", parseInt(context.query.from, 10));
    }
    if (context.query.lat && context.query.lon) {
      searchParams.append("lat", parseFloat(context.query.lat));
      searchParams.append("lon", parseFloat(context.query.lon));
      searchParams.append("city", context.query.city);
    }

    const response = await fetch(`${API_URL}/iframe/${widget._id}/search?${searchParams.toString()}`).then((res) => res.json());

    if (!response.ok) {
      throw response;
    }
    const query = new URLSearchParams({
      widgetId: widget._id,
      requestId: response.request,
    });

    const missions = response.data.map((h) => ({
      ...h,
      url: `${API_URL}/r/${context.query.notrack ? "notrack" : "widget"}/${h._id}?${query.toString()}`,
    }));

    if (context.query.lat && context.query.lon) {
      const lat = parseFloat(context.query.lat);
      const lon = parseFloat(context.query.lon);

      missions.forEach((mission) => {
        if (mission.addresses && mission.addresses.length > 1) {
          mission.addresses.sort((a, b) => {
            if (!a.location || !b.location) {
              return 0;
            }

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
