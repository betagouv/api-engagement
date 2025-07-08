import { usePlausible } from "next-plausible";
import { useEffect, useState } from "react";
import { RiArrowLeftSLine, RiArrowRightSLine, RiSkipLeftLine, RiSkipRightLine } from "react-icons/ri";

import useStore from "../utils/store";
import Card from "./Card";

const Grid = ({ widget, missions, total, page, handlePageChange, request }) => {
  const { color } = useStore();

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
    <div className="mx-auto w-full pt-4">
      <main role="main" className="grid grid-cols-1 gap-x-6 gap-y-6 overflow-x-hidden sm:grid-cols-2 md:gap-y-6 lg:grid-cols-3">
        {missions.map((mission, i) => (
          <div key={i} className="flex justify-center">
            <Card widget={widget} mission={mission} request={request} />
          </div>
        ))}
      </main>
      <div className="flex items-center justify-center py-4 md:hidden">
        <MobilePagination page={page} setPage={handlePageChange} end={parseInt(total / 6) + (total % 6 !== 0 && 1)} />
      </div>
      <div className="hidden items-center justify-center pt-10 md:flex">
        <Pagination page={page} setPage={handlePageChange} end={parseInt(total / 6) + (total % 6 !== 0 && 1)} color={color} />
      </div>
    </div>
  );
};

const Pagination = ({ page, setPage, end }) => {
  const { url, color } = useStore();
  const plausible = usePlausible();
  const [pages, setPages] = useState([...Array(end).keys()].map((i) => i + 1));

  useEffect(() => {
    if (page < 1) {
      setPage(1);
    }
    if (page > end) {
      setPage(end);
    }
    if (end !== pages.length) {
      setPages([...Array(end).keys()].map((i) => i + 1));
    }
  }, [end]);

  return (
    <div className="flex flex-row items-center justify-center gap-1">
      <button
        className="mr-4 flex cursor-pointer items-center rounded-lg px-3 py-2 hover:bg-[#f5f5f5] disabled:cursor-default disabled:bg-transparent disabled:opacity-50"
        onClick={() => {
          setPage(page - 1);
          plausible("Page changed", { u: url });
        }}
        disabled={page === 1}
      >
        <RiArrowLeftSLine className="mr-2" />
        Précédente
      </button>
      <div className="mx-4 flex flex-row items-center">
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
                    plausible("Page changed", { u: url });
                  }}
                >
                  {p}
                </button>
              ))}
              <button className="hover:bg-gray-hover flex h-8 w-8 items-center justify-center rounded-full">...</button>
              <button
                className="hover:bg-gray-hover flex h-8 w-8 cursor-pointer items-center justify-center rounded-full"
                onClick={() => {
                  setPage(end);
                  plausible("Page changed", { u: url });
                }}
              >
                {end}
              </button>
            </>
          ) : page > end - 3 ? (
            <>
              <button className="hover:bg-gray-hover flex h-8 w-8 cursor-pointer items-center justify-center rounded-full" onClick={() => setPage(1)}>
                1
              </button>
              <button className="hover:bg-gray-hover flex h-8 w-8 items-center justify-center rounded-full">...</button>
              {pages.slice(end - 4, end).map((p) => (
                <button
                  key={p}
                  className="hover:bg-gray-hover flex h-8 w-8 cursor-pointer items-center justify-center rounded-full"
                  style={p === page ? { backgroundColor: color, color: "white" } : {}}
                  onClick={() => {
                    setPage(p);
                    plausible("Page changed", { u: url });
                  }}
                >
                  {p}
                </button>
              ))}
            </>
          ) : (
            <>
              <button className="hover:bg-gray-hover flex h-8 w-8 cursor-pointer items-center justify-center rounded-full" onClick={() => setPage(1)}>
                1
              </button>
              <button className="hover:bg-gray-hover flex h-8 w-8 items-center justify-center rounded-full">...</button>
              {pages.slice(page - 2, page + 1).map((p) => (
                <button
                  key={p}
                  className="hover:bg-gray-hover flex h-8 w-8 cursor-pointer items-center justify-center rounded-full"
                  style={p === page ? { backgroundColor: color, color: "white" } : {}}
                  onClick={() => {
                    setPage(p);
                    plausible("Page changed", { u: url });
                  }}
                >
                  {p}
                </button>
              ))}
              <button className="hover:bg-gray-hover flex h-8 w-8 items-center justify-center rounded-full" disabled={true}>
                ...
              </button>
              <button className="hover:bg-gray-hover flex h-8 w-8 cursor-pointer items-center justify-center rounded-full" onClick={() => setPage(end)}>
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
                plausible("Page changed", { u: url });
              }}
            >
              {p}
            </button>
          ))
        )}
      </div>
      <button
        className="ml-4 flex cursor-pointer items-center rounded-lg px-3 py-2 hover:bg-[#f5f5f5] disabled:cursor-default disabled:opacity-50"
        onClick={() => {
          setPage(page + 1);
          plausible("Page changed", { u: url });
        }}
        disabled={page === end}
      >
        Suivante
        <RiArrowRightSLine className="ml-2" />
      </button>
    </div>
  );
};

export const MobilePagination = ({ page, setPage, end }) => {
  const { url, color } = useStore();
  const plausible = usePlausible();
  const [pages, setPages] = useState([...Array(end).keys()].map((i) => i + 1));

  useEffect(() => {
    if (page > end) {
      setPage(end);
    }
    if (end !== pages.length) {
      setPages([...Array(end).keys()].map((i) => i + 1));
    }
  }, [end]);

  return (
    <div className="flex flex-row items-center justify-between">
      <button
        className="flex h-8 w-8 items-center justify-center rounded focus:outline-none focus-visible:ring focus-visible:ring-blue-800"
        onClick={() => {
          setPage(1);
          plausible("Page changed", { u: url });
        }}
        disabled={page === 1}
        aria-label="Retour première page"
      >
        <RiSkipLeftLine />
      </button>
      <button
        className="flex h-8 w-8 items-center justify-center rounded focus:outline-none focus-visible:ring focus-visible:ring-blue-800"
        onClick={() => {
          setPage(page - 1);
          plausible("Page changed", { u: url });
        }}
        disabled={page === 1}
        aria-label="Page précédente"
      >
        <RiArrowLeftSLine />
      </button>
      <div className="mx-4 flex flex-row items-center gap-1">
        {end > 4 ? (
          page < 3 ? (
            <>
              {pages.slice(0, 3).map((p) => (
                <button
                  key={p}
                  className="hover:bg-gray-hover flex h-8 min-w-[2rem] items-center justify-center rounded-full p-1 focus:outline-none focus-visible:ring focus-visible:ring-blue-800"
                  style={p === page ? { backgroundColor: color, color: "white" } : {}}
                  onClick={() => {
                    setPage(p);
                    plausible("Page changed", { u: url });
                  }}
                >
                  {p}
                </button>
              ))}
              <button className="hover:bg-gray-hover flex h-8 w-8 items-center justify-center rounded-full focus:outline-none focus-visible:ring focus-visible:ring-blue-800">
                ...
              </button>
              <button
                className="hover:bg-gray-hover flex h-8 min-w-[2rem] items-center justify-center rounded-full p-1 focus:outline-none focus-visible:ring focus-visible:ring-blue-800"
                onClick={() => {
                  setPage(end);
                  plausible("Page changed", { u: url });
                }}
              >
                {end}
              </button>
            </>
          ) : page > end - 3 ? (
            <>
              <button
                className="hover:bg-gray-hover flex h-8 w-8 items-center justify-center rounded-full focus:outline-none focus-visible:ring focus-visible:ring-blue-800"
                onClick={() => {
                  setPage(1);
                  plausible("Page changed", { u: url });
                }}
              >
                1
              </button>
              <button className="hover:bg-gray-hover flex h-8 w-8 items-center justify-center rounded-full focus:outline-none focus-visible:ring focus-visible:ring-blue-800">
                ...
              </button>
              {pages.slice(end - 3, end).map((p) => (
                <button
                  key={p}
                  className="hover:bg-gray-hover flex h-8 min-w-[2rem] items-center justify-center rounded-full p-1 focus:outline-none focus-visible:ring focus-visible:ring-blue-800"
                  style={p === page ? { backgroundColor: color, color: "white" } : {}}
                  onClick={() => {
                    setPage(p);
                    plausible("Page changed", { u: url });
                  }}
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
                  className="hover:bg-gray-hover flex h-8 min-w-[2rem] items-center justify-center rounded-full p-1 focus:outline-none focus-visible:ring focus-visible:ring-blue-800"
                  style={p === page ? { backgroundColor: color, color: "white" } : {}}
                  onClick={() => {
                    setPage(p);
                    plausible("Page changed", { u: url });
                  }}
                >
                  {p}
                </button>
              ))}
              <button
                className="hover:bg-gray-hover flex h-8 w-8 items-center justify-center rounded focus:outline-none focus-visible:ring focus-visible:ring-blue-800"
                disabled={true}
              >
                ...
              </button>
              <button
                className="hover:bg-gray-hover flex h-8 min-w-[2rem] items-center justify-center rounded focus:outline-none focus-visible:ring focus-visible:ring-blue-800"
                onClick={() => {
                  setPage(end);
                  plausible("Page changed", { u: url });
                }}
              >
                {end}
              </button>
            </>
          )
        ) : (
          pages.map((p) => (
            <button
              key={p}
              className="hover:bg-gray-hover flex h-8 w-8 items-center justify-center rounded-full focus:outline-none focus-visible:ring focus-visible:ring-blue-800"
              style={p === page ? { backgroundColor: color, color: "white" } : {}}
              onClick={() => {
                setPage(p);
                plausible("Page changed", { u: url });
              }}
            >
              {p}
            </button>
          ))
        )}
      </div>
      <button
        className="flex h-8 w-8 items-center justify-center rounded focus:outline-none focus-visible:ring focus-visible:ring-blue-800"
        onClick={() => {
          setPage(page + 1);
          plausible("Page changed", { u: url });
        }}
        aria-label="Page suivante"
        disabled={page === end}
      >
        <RiArrowRightSLine />
      </button>
      <button
        className="flex h-8 w-8 items-center justify-center rounded focus:outline-none focus-visible:ring focus-visible:ring-blue-800"
        onClick={() => {
          setPage(end);
          plausible("Page changed", { u: url });
        }}
        aria-label="Dernière page"
        disabled={page === end}
      >
        <RiSkipRightLine />
      </button>
    </div>
  );
};

export default Grid;
