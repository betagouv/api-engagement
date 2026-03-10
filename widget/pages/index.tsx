import { GetServerSideProps, GetServerSidePropsContext } from "next";
import Image from "next/image";
import { useRouter } from "next/router";
import Script from "next/script";
import { useEffect, useState } from "react";

import { usePlausible } from "next-plausible";
import Filters from "@/components/Filters";
import MissionContainer from "@/components/MissionContainer";
import { API_URL, ENV } from "@/config";
import useMissions from "@/hooks/useMissions";
import useSyncWidgetQuery from "@/hooks/useSyncWidgetQuery";
import LogoSC from "@/public/images/logo-sc.svg";
import { Filters as FilterTypes, PageProps, Widget } from "@/types";
import { fetchLocation } from "@/utils/fetchLocation";
import { fetchWithTimeout } from "@/utils/fetchWithTimeout";
import { generateRequestId, REQUEST_ID_HEADER } from "@/utils/requestId";
import resizeHelper from "@/utils/resizeHelper";
import { captureExceptionWithRequestId, captureMessageWithRequestId } from "@/utils/sentry";
import useStore from "@/utils/store";

const getInitialFilters = (widget: Widget, query: Record<string, string | string[] | undefined>): FilterTypes => {
  const isBenevolat = widget?.type === "benevolat";
  const size = widget?.style === "carousel" ? (isBenevolat ? 25 : 40) : 6;

  const parseList = (value?: string | string[]): string[] => {
    const raw = Array.isArray(value) ? value : value ? [value] : [];
    return raw.flatMap((item) => item.split(","));
  };

  const toFilterOptions = (values: string[]) => values.map((v) => ({ label: v, value: v }));

  const domain = toFilterOptions(parseList(query.domain));
  const lat = query.lat ? parseFloat(String(query.lat)) : undefined;
  const lon = query.lon ? parseFloat(String(query.lon)) : undefined;
  const city = query.city ? String(query.city) : undefined;
  const location = lat && lon ? { label: city || "", value: "", lat, lon, city: city || "", postcode: "" } : null;

  const from = query.from ? parseInt(String(query.from), 10) : 0;
  const page = Math.floor(from / size) + 1;

  if (isBenevolat) {
    return {
      domain,
      location,
      page,
      size,
      organization: toFilterOptions(parseList(query.organization)),
      department: toFilterOptions(parseList(query.department)),
      remote: query.remote ? { label: String(query.remote), value: String(query.remote) } : null,
    };
  }

  return {
    domain,
    location,
    page,
    size,
    start: null,
    duration: query.duration ? { label: `${query.duration} mois`, value: String(query.duration) } : null,
    schedule: query.schedule ? { label: String(query.schedule), value: String(query.schedule) } : null,
    minor: query.minor ? { label: String(query.minor), value: String(query.minor) } : null,
    accessibility: query.accessibility ? { label: String(query.accessibility), value: String(query.accessibility) } : null,
    action: toFilterOptions(parseList(query.action)),
    beneficiary: toFilterOptions(parseList(query.beneficiary)),
    country: toFilterOptions(parseList(query.country)),
  };
};

const Home = ({ widget, apiUrl, environment }: PageProps) => {
  const isBenevolat = widget?.type === "benevolat";
  const color = widget?.color ? widget.color : "#71A246";

  const router = useRouter();
  const plausible = usePlausible();

  const { setUrl, setColor, setMobile } = useStore();
  const [filters, setFilters] = useState<FilterTypes>(() => getInitialFilters(widget!, router.query));
  const [showFilters, setShowFilters] = useState(false);

  const notrack = !!router.query.notrack;
  const { missions, total, request, isLoading } = useMissions({ widget, filters, apiUrl, notrack });

  useEffect(() => {
    if (!widget) return;

    const url = new URL(location.href);
    const u = `${url.protocol}//${url.hostname}/${widget.style === "page" ? "catalogue" : "carousel"}`;
    setUrl(u);
    setColor(color);
    plausible("pageview", { u });

    if (widget.location) {
      setFilters((f) => ({ ...f, location: widget.location || null }));
      return;
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const loc = await fetchLocation(position.coords.latitude, position.coords.longitude);
          if (loc) {
            setFilters((f) => ({ ...f, location: loc }));
          }
        },
        (error) => {
          console.error("Error getting location:", error);
        },
      );
    }
  }, [widget?.id]);

  useEffect(() => {
    setMobile(window.innerWidth < 768);
    const handleResize = () => setMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);

    const cleanup = resizeHelper.setupResizeObserver();
    return () => {
      if (typeof cleanup === "function") {
        cleanup();
      }
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useSyncWidgetQuery({ widget, filters, router, isBenevolat: !!isBenevolat });

  if (!widget) {
    return <div className="flex h-full w-full items-center justify-center">Erreur lors du chargement du widget</div>;
  }

  return (
    <div className="p-4 xl:px-0 md:max-w-[1200px] flex flex-col justify-start items-center mx-auto">
      <header role="banner" className={`w-full space-y-4 md:space-y-8 ${widget.style === "carousel" ? "md:max-w-[1168px] md:px-14" : ""}`}>
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <h1 className="text-[28px] font-bold leading-[36px] md:p-0">{isBenevolat ? "Trouver une mission de bénévolat" : "Trouver une mission de Service Civique"}</h1>
        </div>
        <Filters
          widget={widget}
          apiUrl={apiUrl}
          values={filters}
          total={total}
          onChange={(newFilters) => setFilters({ ...filters, ...newFilters, page: 1 })}
          show={showFilters}
          onShow={setShowFilters}
        />
      </header>
      <div className={`w-full ${showFilters ? (widget.style === "carousel" ? "hidden" : "opacity-40 pointer-events-none") : "h-auto"}`}>
        <MissionContainer
          widget={widget}
          missions={missions}
          total={total}
          request={request}
          isLoading={isLoading}
          page={filters.page}
          onPageChange={(page) => setFilters({ ...filters, page })}
        />
      </div>
      {environment === "production" && !notrack && <Script src="https://app.api-engagement.beta.gouv.fr/jstag.js" />}
      {!isBenevolat && (
        <footer role="contentinfo" className={`mt-6 flex w-full justify-center items-center gap-4 px-4 ${showFilters ? "opacity-40 pointer-events-none" : ""}`}>
          <Image src={LogoSC} width="100" height="0" style={{ width: "53px", height: "auto" }} alt="Service Civique" />
          <p className="text-xs text-[#666]">
            Proposé par l&apos;Agence du Service Civique{" "}
            <a href="https://www.service-civique.gouv.fr/" target="_blank" rel="noopener noreferrer" className="underline text-[#000091] text-center">
              service-civique.gouv.fr
            </a>
          </p>
        </footer>
      )}
    </div>
  );
};

export const getServerSideProps: GetServerSideProps<PageProps> = async (context: GetServerSidePropsContext) => {
  const emptyProps: PageProps = { widget: null, apiUrl: API_URL, environment: ENV };

  if (!context.query.widgetName && !context.query.widget) {
    return { props: emptyProps };
  }

  const rawRequestId = context.req?.headers?.[REQUEST_ID_HEADER];
  const requestId = (Array.isArray(rawRequestId) ? rawRequestId[0] : rawRequestId) ?? generateRequestId();

  try {
    const widgetId = Array.isArray(context.query.widget) ? context.query.widget[0] : context.query.widget;
    const widgetName = Array.isArray(context.query.widgetName) ? context.query.widgetName[0] : context.query.widgetName;
    const q = widgetId ? `id=${widgetId}` : `name=${widgetName}`;

    const rawRes = await fetchWithTimeout(`${API_URL}/iframe/widget?${q}`, { label: "iframe-widget", requestId }, { headers: { [REQUEST_ID_HEADER]: requestId } });
    if (!rawRes.ok) {
      captureMessageWithRequestId(requestId, `Widget API error: ${rawRes.status}`, { query: context.query, queryString: q });
      return { props: emptyProps };
    }
    const res = await rawRes.json();
    if (!res.ok) {
      captureMessageWithRequestId(requestId, `Widget error: ${res.code}`, { query: context.query, queryString: q, code: res.code });
      return { props: emptyProps };
    }

    if (!res.data) {
      captureMessageWithRequestId(requestId, "Widget not found", { query: context.query });
      return { props: emptyProps };
    }

    return { props: { widget: res.data, apiUrl: API_URL, environment: ENV } };
  } catch (error) {
    console.error(error);
    captureExceptionWithRequestId(requestId, error, { query: context.query });
    return { props: emptyProps };
  }
};

export default Home;
