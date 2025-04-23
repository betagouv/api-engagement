import React, { useEffect, useState } from "react";
import { RiArrowRightSLine, RiArrowLeftSLine, RiSkipRightLine, RiSkipLeftLine } from "react-icons/ri";

import Card from "./Card";
import { usePlausible } from "next-plausible";
import useStore from "../store";

const Grid = ({ widget, missions, total, page, request, handlePageChange }) => {
  if (total === 0) {
    return (
      <div className="w-full">
        <div className="flex items-center justify-center py-4">
          <p className="text-lg font-semibold">Aucune mission ne correspond à votre recherche</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full mx-auto">
      <main className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-4 md:gap-y-6 gap-x-6">
        {missions.map((mission, i) => (
          <div key={i}>
            <Card widget={widget} mission={mission} request={request} />
          </div>
        ))}
      </main>
      <footer className="flex md:hidden items-center justify-center pt-4">
        <MobilePagination page={page} setPage={handlePageChange} end={parseInt(total / 6) + (total % 6 !== 0 && 1)} />
      </footer>
      <footer className="md:flex hidden items-center justify-center pt-8">
        <Pagination page={page} setPage={handlePageChange} end={parseInt(total / 6) + (total % 6 !== 0 && 1)} />
      </footer>
    </div>
  );
};

const Pagination = ({ page, setPage, end }) => {
  const { url, color } = useStore();
  const plausible = usePlausible();
  const [pages, setPages] = useState([...Array(end).keys()].map((i) => i + 1));

  useEffect(() => {
    if (page > end) setPage(end);
    if (end !== pages.length) setPages([...Array(end).keys()].map((i) => i + 1));
  }, [end]);

  return (
    <div className="flex flex-row items-center justify-center gap-1">
      <button
        className="mr-4 flex items-center rounded-lg py-2 px-3 hover:bg-[#f5f5f5] disabled:opacity-50 disabled:bg-transparent disabled:cursor-default focus:outline-none focus-visible:ring focus-visible:ring-blue-800"
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
                  className="flex h-8 w-8 rounded-full items-center justify-center hover:bg-gray-hover focus:outline-none focus-visible:ring focus-visible:ring-blue-800"
                  style={{ backgroundColor: p === page ? color : "", color: p === page ? "white" : "" }}
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
                className="flex h-8 w-8 rounded-full items-center justify-center hover:bg-gray-hover focus:outline-none focus-visible:ring focus-visible:ring-blue-800"
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
              {pages.slice(end - 4, end).map((p) => (
                <button
                  key={p}
                  className="flex h-8 w-8 rounded-full items-center justify-center hover:bg-gray-hover focus:outline-none focus-visible:ring focus-visible:ring-blue-800"
                  style={{ backgroundColor: p === page ? color : "", color: p === page ? "white" : "" }}
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
              {pages.slice(page - 2, page + 1).map((p) => (
                <button
                  key={p}
                  className="flex h-8 w-8 rounded-full items-center justify-center hover:bg-gray-hover focus:outline-none focus-visible:ring focus-visible:ring-blue-800"
                  style={{ backgroundColor: p === page ? color : "", color: p === page ? "white" : "" }}
                  onClick={() => {
                    setPage(p);
                    plausible("Page changed", { u: url });
                  }}
                >
                  {p}
                </button>
              ))}
              <button
                className="flex h-8 w-8 rounded-full items-center justify-center hover:bg-gray-hover focus:outline-none focus-visible:ring focus-visible:ring-blue-800"
                disabled={true}
              >
                ...
              </button>
              <button
                className="flex h-8 w-8 rounded-full items-center justify-center hover:bg-gray-hover focus:outline-none focus-visible:ring focus-visible:ring-blue-800"
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
              style={{ backgroundColor: p === page ? color : "", color: p === page ? "white" : "" }}
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
        className="ml-4 flex items-center rounded-lg py-2 px-3 hover:bg-[#f5f5f5] disabled:opacity-50 disabled:cursor-default focus:outline-none focus-visible:ring focus-visible:ring-blue-800"
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

const MobilePagination = ({ page, setPage, end }) => {
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
        className="flex h-8 w-8 items-center justify-center rounded focus:outline-none focus-visible:ring focus-visible:ring-blue-800"
        aria-label="Retour première page"
        onClick={() => {
          setPage(1);
          plausible("Page changed", { u: url });
        }}
        disabled={page === 1}
      >
        <RiSkipLeftLine />
      </button>
      <button
        className="flex h-8 w-8 items-center justify-center rounded focus:outline-none focus-visible:ring focus-visible:ring-blue-800"
        aria-label="Page précédente"
        onClick={() => {
          setPage(page - 1);
          plausible("Page changed", { u: url });
        }}
        disabled={page === 1}
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
                  className="flex h-8 min-w-[2rem] p-1 rounded items-center justify-center hover:bg-gray-hover focus:outline-none focus-visible:ring focus-visible:ring-blue-800"
                  style={{ backgroundColor: p === page ? color : "", color: p === page ? "white" : "" }}
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
                  className="flex h-8 min-w-[2rem] p-1 rounded items-center justify-center hover:bg-gray-hover focus:outline-none focus-visible:ring focus-visible:ring-blue-800"
                  style={{ backgroundColor: p === page ? color : "", color: p === page ? "white" : "" }}
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
                  className="flex h-8 min-w-[2rem] p-1 rounded items-center justify-center hover:bg-gray-hover focus:outline-none focus-visible:ring focus-visible:ring-blue-800"
                  style={{ backgroundColor: p === page ? color : "", color: p === page ? "white" : "" }}
                  onClick={() => {
                    setPage(p);
                    plausible("Page changed", { u: url });
                  }}
                >
                  {p}
                </button>
              ))}
              <button
                className="flex h-8 w-8 rounded-full items-center justify-center hover:bg-gray-hover focus:outline-none focus-visible:ring focus-visible:ring-blue-800"
                disabled={true}
              >
                ...
              </button>
              <button
                className="flex h-8 min-w-[2rem] rounded-full items-center justify-center hover:bg-gray-hover focus:outline-none focus-visible:ring focus-visible:ring-blue-800"
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
              style={{ backgroundColor: p === page ? color : "", color: p === page ? "white" : "" }}
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
        className="flex h-8 w-8 items-center justify-center rounded-full focus:outline-none focus-visible:ring focus-visible:ring-blue-800"
        onClick={() => {
          setPage(page + 1);
          plausible("Page changed", { u: url });
        }}
        disabled={page === end}
        aria-label="Page suivante"
      >
        <RiArrowRightSLine />
      </button>
      <button
        className="flex h-8 w-8 items-center justify-center rounded-full focus:outline-none focus-visible:ring focus-visible:ring-blue-800"
        onClick={() => {
          setPage(end);
          plausible("Page changed", { u: url });
        }}
        disabled={page === end}
        aria-label="Dernière page"
      >
        <RiSkipRightLine />
      </button>
    </div>
  );
};

export default Grid;
