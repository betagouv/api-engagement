import { usePlausible } from "next-plausible";
import { useEffect, useState } from "react";
import { RiArrowLeftSLine, RiArrowRightSLine, RiSkipLeftLine, RiSkipRightLine } from "react-icons/ri";

import { Mission, Widget } from "../types";
import useStore from "../utils/store";
import Card from "./Card";

interface GridProps {
  widget: Widget;
  missions: Mission[];
  total: number;
  page: number;
  handlePageChange: (page: number) => void;
  request: string | null;
}

const Grid = ({ widget, missions, total, page, handlePageChange, request }: GridProps) => {
  const { mobile } = useStore();

  if (total === 0) {
    return (
      <div className="w-full">
        <div className="flex items-center justify-center py-4">
          <p className="text-lg font-semibold">Aucune mission ne correspond à vos critères de recherche</p>
        </div>
      </div>
    );
  }
  return (
    <div className="mx-auto w-full">
      <main role="main" className="grid grid-cols-1 gap-x-6 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
        {missions.map((mission, i) => (
          <Card key={i} widget={widget} mission={mission} request={request} />
        ))}
      </main>
      {mobile ? (
        <MobilePagination page={page} setPage={handlePageChange} end={Math.floor(total / 6) + (total % 6 !== 0 ? 1 : 0)} />
      ) : (
        <Pagination page={page} setPage={handlePageChange} end={Math.floor(total / 6) + (total % 6 !== 0 ? 1 : 0)} />
      )}
    </div>
  );
};

interface PaginationProps {
  page: number;
  setPage: (page: number) => void;
  end: number;
}

const Pagination = ({ page, setPage, end }: PaginationProps) => {
  const { url, color } = useStore();
  const plausible = usePlausible();
  const [pages, setPages] = useState(Array.from({ length: end }, (_, i) => i + 1));

  useEffect(() => {
    if (page < 1) {
      setPage(1);
    }
    if (page > end) {
      setPage(end);
    }
    if (end !== pages.length) {
      setPages(Array.from({ length: end }, (_, i) => i + 1));
    }
  }, [end]);

  return (
    <nav role="navigation" className="flex flex-row items-center justify-center gap-1 pt-10" aria-label="pagination">
      <button
        className="mr-4 flex cursor-pointer items-center rounded-lg px-3 py-2 hover:bg-[#f5f5f5] disabled:cursor-default disabled:bg-transparent disabled:opacity-50"
        onClick={() => {
          setPage(page - 1);
          plausible("Page changed", { u: url || undefined });
        }}
        disabled={page === 1}
        aria-label="Page précédente"
      >
        <RiArrowLeftSLine className="mr-2" />
        Précédente
      </button>

      {end > 5 ? (
        page < 4 ? (
          <>
            {pages.slice(0, 4).map((p) => (
              <button
                key={p}
                className="hover:bg-gray-hover flex h-8 w-8 cursor-pointer items-center justify-center rounded-full"
                style={p === page ? { backgroundColor: color, color: "white" } : {}}
                onClick={() => {
                  setPage(p);
                  plausible("Page changed", { u: url || undefined });
                }}
                aria-label={`Page ${p}${p === page ? ", page actuelle" : ""}`}
                aria-current={p === page ? "page" : undefined}
              >
                {p}
              </button>
            ))}
            <div className="hover:bg-gray-hover flex h-8 w-8 items-center justify-center rounded-full">...</div>
            <button
              className="hover:bg-gray-hover flex h-8 w-8 cursor-pointer items-center justify-center rounded-full"
              onClick={() => {
                setPage(end);
                plausible("Page changed", { u: url || undefined });
              }}
              aria-label={`Page ${end}, dernière page`}
            >
              {end}
            </button>
          </>
        ) : page > end - 3 ? (
          <>
            <button className="hover:bg-gray-hover flex h-8 w-8 cursor-pointer items-center justify-center rounded-full" onClick={() => setPage(1)} aria-label="Page 1">
              1
            </button>
            <div className="hover:bg-gray-hover flex h-8 w-8 items-center justify-center rounded-full">...</div>
            {pages.slice(end - 4, end).map((p) => (
              <button
                key={p}
                className="hover:bg-gray-hover flex h-8 w-8 cursor-pointer items-center justify-center rounded-full"
                style={p === page ? { backgroundColor: color, color: "white" } : {}}
                onClick={() => {
                  setPage(p);
                  plausible("Page changed", { u: url || undefined });
                }}
                aria-label={`Page ${p}${p === end ? ", dernière page" : ""}${p === page ? ", page actuelle" : ""}`}
                aria-current={p === page ? "page" : undefined}
              >
                {p}
              </button>
            ))}
          </>
        ) : (
          <>
            <button className="hover:bg-gray-hover flex h-8 w-8 cursor-pointer items-center justify-center rounded-full" onClick={() => setPage(1)} aria-label="Page 1">
              1
            </button>
            <div className="hover:bg-gray-hover flex h-8 w-8 items-center justify-center rounded-full">...</div>
            {pages.slice(page - 2, page + 1).map((p) => (
              <button
                key={p}
                className="hover:bg-gray-hover flex h-8 w-8 cursor-pointer items-center justify-center rounded-full"
                style={p === page ? { backgroundColor: color, color: "white" } : {}}
                onClick={() => {
                  setPage(p);
                  plausible("Page changed", { u: url || undefined });
                }}
                aria-label={`Page ${p}${p === page ? ", page actuelle" : ""}`}
                aria-current={p === page ? "page" : undefined}
              >
                {p}
              </button>
            ))}
            <div className="hover:bg-gray-hover flex h-8 w-8 items-center justify-center rounded-full">...</div>
            <button
              className="hover:bg-gray-hover flex h-8 w-8 cursor-pointer items-center justify-center rounded-full"
              onClick={() => setPage(end)}
              aria-label={`Page ${end}, dernière page`}
            >
              {end}
            </button>
          </>
        )
      ) : (
        pages.map((p) => (
          <button
            key={p}
            className="hover:bg-gray-hover flex h-8 w-8 cursor-pointer items-center justify-center rounded-full"
            style={p === page ? { backgroundColor: color, color: "white" } : {}}
            onClick={() => {
              setPage(p);
              plausible("Page changed", { u: url || undefined });
            }}
            aria-label={`Page ${p}${p === end ? ", dernière page" : ""}${p === page ? ", page actuelle" : ""}`}
            aria-current={p === page ? "page" : undefined}
          >
            {p}
          </button>
        ))
      )}

      <button
        className="ml-4 flex cursor-pointer items-center rounded-lg px-3 py-2 hover:bg-[#f5f5f5] disabled:cursor-default disabled:opacity-50"
        onClick={() => {
          setPage(page + 1);
          plausible("Page changed", { u: url || undefined });
        }}
        disabled={page === end}
        aria-label="Page suivante"
      >
        Suivante
        <RiArrowRightSLine className="ml-2" />
      </button>
    </nav>
  );
};

interface MobilePaginationProps {
  page: number;
  setPage: (page: number) => void;
  end: number;
}

export const MobilePagination = ({ page, setPage, end }: MobilePaginationProps) => {
  const { url, color } = useStore();
  const plausible = usePlausible();
  const [pages, setPages] = useState(Array.from({ length: end }, (_, i) => i + 1));

  useEffect(() => {
    if (page > end) {
      setPage(end);
    }
    if (end !== pages.length) {
      setPages(Array.from({ length: end }, (_, i) => i + 1));
    }
  }, [end]);

  return (
    <nav role="navigation" className="flex flex-row items-center justify-center gap-1 py-4 mt-6" aria-label="pagination">
      <button
        className="flex h-8 min-w-[2rem] items-center justify-center rounded focus:outline-2 focus:outline-[#0a76f6] focus:outline-offset-2"
        onClick={() => {
          setPage(1);
          plausible("Page changed", { u: url || undefined });
        }}
        disabled={page === 1}
        aria-label="Retour première page"
      >
        <RiSkipLeftLine />
      </button>
      <button
        className="flex h-8 min-w-[2rem] mr-4 items-center justify-center rounded focus:outline-2 focus:outline-[#0a76f6] focus:outline-offset-2"
        onClick={() => {
          setPage(page - 1);
          plausible("Page changed", { u: url || undefined });
        }}
        disabled={page === 1}
        aria-label="Page précédente"
      >
        <RiArrowLeftSLine />
      </button>

      {end > 4 ? (
        page < 3 ? (
          <>
            {pages.slice(0, 3).map((p) => (
              <button
                key={p}
                className="hover:bg-gray-hover flex h-8 min-w-[2rem] items-center justify-center rounded-full p-1 focus:outline-2 focus:outline-[#0a76f6] focus:outline-offset-2"
                style={p === page ? { backgroundColor: color, color: "white" } : {}}
                onClick={() => {
                  setPage(p);
                  plausible("Page changed", { u: url || undefined });
                }}
                aria-label={`Page ${p}${p === page ? ", page actuelle" : ""}`}
                aria-current={p === page ? "page" : undefined}
              >
                {p}
              </button>
            ))}
            <div className="hover:bg-gray-hover flex h-8 min-w-[2rem] items-center justify-center rounded-full focus:outline-2 focus:outline-[#0a76f6] focus:outline-offset-2">
              ...
            </div>
            <button
              className="hover:bg-gray-hover flex h-8 min-w-[2rem] items-center justify-center rounded-full p-1 focus:outline-2 focus:outline-[#0a76f6] focus:outline-offset-2"
              onClick={() => {
                setPage(end);
                plausible("Page changed", { u: url || undefined });
              }}
              aria-label={`Page ${end}, dernière page`}
            >
              {end}
            </button>
          </>
        ) : page > end - 3 ? (
          <>
            <button
              className="hover:bg-gray-hover flex h-8 min-w-[2rem] items-center justify-center rounded-full focus:outline-2 focus:outline-[#0a76f6] focus:outline-offset-2"
              onClick={() => {
                setPage(1);
                plausible("Page changed", { u: url || undefined });
              }}
              aria-label="Page 1"
            >
              1
            </button>
            <div className="hover:bg-gray-hover flex h-8 min-w-[2rem] items-center justify-center rounded-full focus:outline-2 focus:outline-[#0a76f6] focus:outline-offset-2">
              ...
            </div>
            {pages.slice(end - 3, end).map((p) => (
              <button
                key={p}
                className="hover:bg-gray-hover flex h-8 min-w-[2rem] items-center justify-center rounded-full p-1 focus:outline-2 focus:outline-[#0a76f6] focus:outline-offset-2"
                style={p === page ? { backgroundColor: color, color: "white" } : {}}
                onClick={() => {
                  setPage(p);
                  plausible("Page changed", { u: url || undefined });
                }}
                aria-label={`Page ${p}${p === page ? ", page actuelle" : ""}`}
                aria-current={p === page ? "page" : undefined}
              >
                {p}
              </button>
            ))}
          </>
        ) : (
          <>
            {pages.slice(page - 3, page).map((p) => (
              <button
                key={p}
                className="hover:bg-gray-hover flex h-8 min-w-[2rem] items-center justify-center rounded-full p-1 focus:outline-2 focus:outline-[#0a76f6] focus:outline-offset-2"
                style={p === page ? { backgroundColor: color, color: "white" } : {}}
                onClick={() => {
                  setPage(p);
                  plausible("Page changed", { u: url || undefined });
                }}
                aria-label={`Page ${p}${p === page ? ", page actuelle" : ""}`}
                aria-current={p === page ? "page" : undefined}
              >
                {p}
              </button>
            ))}
            <div className="hover:bg-gray-hover flex h-8 min-w-[2rem] items-center justify-center rounded focus:outline-2 focus:outline-[#0a76f6] focus:outline-offset-2">...</div>
            <button
              className="hover:bg-gray-hover flex h-8 min-w-[2rem] items-center justify-center rounded focus:outline-2 focus:outline-[#0a76f6] focus:outline-offset-2"
              onClick={() => {
                setPage(end);
                plausible("Page changed", { u: url || undefined });
              }}
              aria-label={`Page ${end}, dernière page`}
            >
              {end}
            </button>
          </>
        )
      ) : (
        pages.map((p) => (
          <button
            key={p}
            className="hover:bg-gray-hover flex h-8 min-w-[2rem] items-center justify-center rounded-full focus:outline-2 focus:outline-[#0a76f6] focus:outline-offset-2"
            style={p === page ? { backgroundColor: color, color: "white" } : {}}
            onClick={() => {
              setPage(p);
              plausible("Page changed", { u: url || undefined });
            }}
            aria-label={`Page ${p}${p === end ? ", dernière page" : ""}${p === page ? ", page actuelle" : ""}`}
            aria-current={p === page ? "page" : undefined}
          >
            {p}
          </button>
        ))
      )}

      <button
        className="flex h-8 min-w-[2rem] ml-4 items-center justify-center rounded focus:outline-2 focus:outline-[#0a76f6] focus:outline-offset-2"
        onClick={() => {
          setPage(page + 1);
          plausible("Page changed", { u: url || undefined });
        }}
        aria-label="Page suivante"
        disabled={page === end}
      >
        <RiArrowRightSLine />
      </button>
      <button
        className="flex h-8 min-w-[2rem] items-center justify-center rounded focus:outline-2 focus:outline-[#0a76f6] focus:outline-offset-2"
        onClick={() => {
          setPage(end);
          plausible("Page changed", { u: url || undefined });
        }}
        aria-label="Dernière page"
        disabled={page === end}
      >
        <RiSkipRightLine />
      </button>
    </nav>
  );
};

export default Grid;
