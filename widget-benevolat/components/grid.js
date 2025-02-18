import React, { useEffect, useState } from "react";
import { RiArrowRightSLine, RiArrowLeftSLine, RiSkipRightLine, RiSkipLeftLine } from "react-icons/ri";
import { usePlausible } from "next-plausible";

import Card from "./card";
import useStore from "../store";

export const Grid = ({ widget, missions, total, page, handlePageChange, request }) => {
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
    <div className="w-full mx-auto pt-4">
      <main className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-6 md:gap-y-6 gap-x-6 overflow-x-hidden">
        {missions.map((mission, i) => (
          <div key={i} className="flex justify-center">
            <Card widget={widget} mission={mission} request={request} />
          </div>
        ))}
      </main>
      <footer className="flex md:hidden items-center justify-center py-4">
        <MobilePagination page={page} setPage={handlePageChange} end={parseInt(total / 6) + (total % 6 !== 0 && 1)} />
      </footer>
      <footer className="md:flex hidden items-center justify-center pt-10">
        <Pagination page={page} setPage={handlePageChange} end={parseInt(total / 6) + (total % 6 !== 0 && 1)} color={color} />
      </footer>
    </div>
  );
};

const Pagination = ({ page, setPage, end }) => {
  const { url, color } = useStore();
  const plausible = usePlausible();
  const [pages, setPages] = useState([...Array(end).keys()].map((i) => i + 1));

  useEffect(() => {
    if (page < 1) setPage(1);
    if (page > end) setPage(end);
    if (end !== pages.length) setPages([...Array(end).keys()].map((i) => i + 1));
  }, [end]);

  return (
    <div className="flex flex-row items-center justify-center gap-1">
      <button
        className="mr-4 flex items-center rounded-lg py-2 px-3 hover:bg-light-grey disabled:opacity-50 disabled:bg-transparent disabled:cursor-default"
        onClick={() => {
          setPage(page - 1);
          plausible("Page changed", { u: url });
        }}
        disabled={page === 1}
      >
        <RiArrowLeftSLine className="mr-2" />
        Précédente
      </button>
      <div className="flex flex-row items-center mx-4">
        {end > 5 ? (
          page < 4 ? (
            <>
              {pages.slice(0, 4).map((p) => (
                <button
                  key={p}
                  className="flex h-8 w-8 rounded-full items-center justify-center hover:bg-gray-hover"
                  style={p === page ? { backgroundColor: color, color: "white" } : {}}
                  onClick={() => {
                    setPage(p);
                    plausible("Page changed", { u: url });
                  }}
                >
                  {p}
                </button>
              ))}
              <button className="flex h-8 w-8 rounded-full items-center justify-center hover:bg-gray-hover">...</button>
              <button
                className="flex h-8 w-8 rounded-full items-center justify-center hover:bg-gray-hover"
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
              <button className="flex h-8 w-8 rounded-full items-center justify-center hover:bg-gray-hover" onClick={() => setPage(1)}>
                1
              </button>
              <button className="flex h-8 w-8 rounded-full items-center justify-center hover:bg-gray-hover">...</button>
              {pages.slice(end - 4, end).map((p) => (
                <button
                  key={p}
                  className="flex h-8 w-8 rounded-full items-center justify-center hover:bg-gray-hover"
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
              <button className="flex h-8 w-8 rounded-full items-center justify-center hover:bg-gray-hover" onClick={() => setPage(1)}>
                1
              </button>
              <button className="flex h-8 w-8 rounded-full items-center justify-center hover:bg-gray-hover">...</button>
              {pages.slice(page - 2, page + 1).map((p) => (
                <button
                  key={p}
                  className="flex h-8 w-8 rounded-full items-center justify-center hover:bg-gray-hover"
                  style={p === page ? { backgroundColor: color, color: "white" } : {}}
                  onClick={() => {
                    setPage(p);
                    plausible("Page changed", { u: url });
                  }}
                >
                  {p}
                </button>
              ))}
              <button className="flex h-8 w-8 rounded-full items-center justify-center hover:bg-gray-hover" disabled={true}>
                ...
              </button>
              <button className="flex h-8 w-8 rounded-full items-center justify-center hover:bg-gray-hover" onClick={() => setPage(end)}>
                {end}
              </button>
            </>
          )
        ) : (
          pages.map((p) => (
            <button
              key={p}
              className="flex h-8 w-8 rounded-full items-center justify-center hover:bg-gray-hover"
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
        className="ml-4 flex items-center rounded-lg py-2 px-3 hover:bg-light-grey disabled:opacity-50 disabled:cursor-default"
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
    if (page > end) setPage(end);
    if (end !== pages.length) setPages([...Array(end).keys()].map((i) => i + 1));
  }, [end]);

  return (
    <div className="flex flex-row items-center justify-between">
      <button
        className="flex h-8 w-8 items-center rounded justify-center focus:outline-none focus-visible:ring focus-visible:ring-blue-800"
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
        className="flex h-8 w-8 items-center rounded justify-center focus:outline-none focus-visible:ring focus-visible:ring-blue-800"
        onClick={() => {
          setPage(page - 1);
          plausible("Page changed", { u: url });
        }}
        disabled={page === 1}
        aria-label="Page précédente"
      >
        <RiArrowLeftSLine />
      </button>
      <div className="flex flex-row items-center mx-4 gap-1">
        {end > 4 ? (
          page < 3 ? (
            <>
              {pages.slice(0, 3).map((p) => (
                <button
                  key={p}
                  className="flex h-8 min-w-[2rem] p-1 rounded-full items-center justify-center hover:bg-gray-hover focus:outline-none focus-visible:ring focus-visible:ring-blue-800"
                  style={p === page ? { backgroundColor: color, color: "white" } : {}}
                  onClick={() => {
                    setPage(p);
                    plausible("Page changed", { u: url });
                  }}
                >
                  {p}
                </button>
              ))}
              <button className="flex h-8 w-8 rounded-full items-center justify-center hover:bg-gray-hover focus:outline-none focus-visible:ring focus-visible:ring-blue-800">
                ...
              </button>
              <button
                className="flex h-8 min-w-[2rem] p-1 rounded-full items-center justify-center hover:bg-gray-hover focus:outline-none focus-visible:ring focus-visible:ring-blue-800"
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
                className="flex h-8 w-8 rounded-full items-center justify-center hover:bg-gray-hover focus:outline-none focus-visible:ring focus-visible:ring-blue-800"
                onClick={() => {
                  setPage(1);
                  plausible("Page changed", { u: url });
                }}
              >
                1
              </button>
              <button className="flex h-8 w-8 rounded-full items-center justify-center hover:bg-gray-hover focus:outline-none focus-visible:ring focus-visible:ring-blue-800">
                ...
              </button>
              {pages.slice(end - 3, end).map((p) => (
                <button
                  key={p}
                  className="flex h-8 min-w-[2rem] p-1 rounded-full items-center justify-center hover:bg-gray-hover focus:outline-none focus-visible:ring focus-visible:ring-blue-800"
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
                  className="flex h-8 min-w-[2rem] p-1 rounded-full items-center justify-center hover:bg-gray-hover focus:outline-none focus-visible:ring focus-visible:ring-blue-800"
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
                className="flex h-8 w-8 rounded items-center justify-center hover:bg-gray-hover focus:outline-none focus-visible:ring focus-visible:ring-blue-800"
                disabled={true}
              >
                ...
              </button>
              <button
                className="flex h-8 min-w-[2rem] rounded items-center justify-center hover:bg-gray-hover focus:outline-none focus-visible:ring focus-visible:ring-blue-800"
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
              className="flex h-8 w-8 rounded-full items-center justify-center hover:bg-gray-hover focus:outline-none focus-visible:ring focus-visible:ring-blue-800"
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
        className="flex h-8 w-8 items-center rounded justify-center focus:outline-none focus-visible:ring focus-visible:ring-blue-800"
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
        className="flex h-8 w-8 items-center rounded justify-center focus:outline-none focus-visible:ring focus-visible:ring-blue-800"
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
