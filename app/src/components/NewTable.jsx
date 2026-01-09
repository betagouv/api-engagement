import { useEffect, useState } from "react";
import { BiFirstPage, BiLastPage } from "react-icons/bi";
import { IoIosArrowDown } from "react-icons/io";
import { MdNavigateBefore, MdNavigateNext } from "react-icons/md";

import Loader from "./Loader";

const Table = ({ header, sortBy, total, onSort, loading, children, auto = false, sticky = false, className = "", pagination = true, page, onPageChange, pageSize = 10 }) => {
  return (
    <>
      <table className={`w-full ${auto ? "table-auto" : "table-fixed"} ${className}`}>
        <thead className={`text-left ${sticky ? "sticky top-0 z-10 shadow-sm" : ""}`}>
          <tr className="table-header">
            {header.map((item, index) => {
              return (
                <th key={index} className="p-4" colSpan={item.colSpan || 1}>
                  <button
                    className={`group flex w-full items-center gap-2 ${item.position === "right" ? "justify-end" : item.position === "center" ? "justify-center" : "justify-start"}`}
                    onClick={() => item.key && onSort && onSort(item.key)}
                  >
                    <div className="relative">
                      {typeof item.title === "string" ? (
                        <h3 className={`text-sm font-semibold ${item.position === "right" ? "text-right" : item.position === "center" ? "text-center" : "text-left"}`}>
                          {item.title}
                        </h3>
                      ) : (
                        item.title
                      )}

                      {item.key && onSort && (
                        <IoIosArrowDown className={`${sortBy === item.key ? "block" : "hidden group-hover:block"} absolute top-1/2 -right-4 -translate-y-1/2`} />
                      )}
                    </div>
                  </button>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="relative">
          {loading ? (
            <tr>
              <td colSpan={header.reduce((acc, item) => acc + (item.colSpan || 1), 0)}>
                <div className="bg-gray-975 flex w-full justify-center py-4">
                  <Loader />
                </div>
              </td>
            </tr>
          ) : total === 0 ? (
            <tr>
              <td colSpan={header.reduce((acc, item) => acc + (item.colSpan || 1), 0)} className="bg-gray-975 py-4 text-center">
                Aucune donnée trouvée
              </td>
            </tr>
          ) : (
            children
          )}
        </tbody>
      </table>
      {pagination && (
        <div className="mt-3">
          <Pagination page={page} setPage={onPageChange} end={Math.ceil(total / pageSize) || 1} />
        </div>
      )}
    </>
  );
};

const Pagination = ({ page, setPage, end }) => {
  const [pages, setPages] = useState([...Array(end).keys()].map((i) => i + 1));

  useEffect(() => {
    if (page < 1) setPage(1);
    if (page > end && end > 0) setPage(end);
    setPages([...Array(end).keys()].map((i) => i + 1));
  }, [end]);

  return (
    <div className="flex flex-row items-center justify-center gap-1 text-sm">
      <button
        className="hover:bg-gray-975 flex h-8 w-8 items-center justify-center disabled:opacity-60 disabled:hover:bg-transparent"
        onClick={() => setPage(1)}
        disabled={page === 1}
      >
        <BiFirstPage />
      </button>
      <button
        className="hover:bg-gray-975 mr-4 flex h-8 items-center gap-1 px-2 disabled:opacity-60 disabled:hover:bg-transparent"
        onClick={() => setPage(page - 1)}
        disabled={page === 1}
      >
        <MdNavigateBefore className="mr-1" />
        Page précédente
      </button>
      {end > 5 ? (
        page < 4 ? (
          <>
            {pages.slice(0, 4).map((p) => (
              <button key={p} className={`hover:bg-gray-975 flex h-8 w-8 items-center justify-center ${p === page ? "bg-blue-france text-white" : ""}`} onClick={() => setPage(p)}>
                {p}
              </button>
            ))}
            <button className="hover:bg-gray-975 flex h-8 w-8 items-center justify-center">...</button>
            <button className="hover:bg-gray-975 flex h-8 w-8 items-center justify-center" onClick={() => setPage(end)}>
              {end}
            </button>
          </>
        ) : page > end - 3 ? (
          <>
            <button className="hover:bg-gray-975 flex h-8 w-8 items-center justify-center" onClick={() => setPage(1)}>
              1
            </button>
            <button className="hover:bg-gray-975 flex h-8 w-8 items-center justify-center">...</button>
            {pages.slice(end - 4, end).map((p) => (
              <button key={p} className={`hover:bg-gray-975 flex h-8 w-8 items-center justify-center ${p === page ? "bg-blue-france text-white" : ""}`} onClick={() => setPage(p)}>
                {p}
              </button>
            ))}
          </>
        ) : (
          <>
            <button className="hover:bg-gray-975 flex h-8 w-8 items-center justify-center" onClick={() => setPage(1)}>
              1
            </button>
            <button className="hover:bg-gray-975 flex h-8 w-8 items-center justify-center">...</button>
            {pages.slice(page - 2, page + 1).map((p) => (
              <button key={p} className={`hover:bg-gray-975 flex h-8 w-8 items-center justify-center ${p === page ? "bg-blue-france text-white" : ""}`} onClick={() => setPage(p)}>
                {p}
              </button>
            ))}
            <button className="hover:bg-gray-975 flex h-8 w-8 items-center justify-center" disabled={true}>
              ...
            </button>
            <button className="hover:bg-gray-975 flex h-8 w-8 items-center justify-center" onClick={() => setPage(end)}>
              {end}
            </button>
          </>
        )
      ) : (
        pages.map((p) => (
          <button key={p} className={`hover:bg-gray-975 flex h-8 w-8 items-center justify-center ${p === page ? "bg-blue-france text-white" : ""}`} onClick={() => setPage(p)}>
            {p}
          </button>
        ))
      )}
      <button
        className="hover:bg-gray-975 ml-4 flex h-8 items-center gap-1 px-2 disabled:opacity-60 disabled:hover:bg-transparent"
        onClick={() => setPage(page + 1)}
        disabled={page === end}
      >
        Page suivante
        <MdNavigateNext className="ml-1" />
      </button>
      <button
        className="hover:bg-gray-975 flex h-8 w-8 items-center justify-center disabled:opacity-60 disabled:hover:bg-transparent"
        onClick={() => setPage(end)}
        disabled={page === end}
      >
        <BiLastPage />
      </button>
    </div>
  );
};

export default Table;
