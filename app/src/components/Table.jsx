import { useEffect, useState } from "react";

import { IoIosArrowDown } from "react-icons/io";
import { RiArrowLeftSLine, RiArrowRightSLine, RiSkipLeftLine, RiSkipRightLine } from "react-icons/ri";

import Loader from "@/components/Loader";

const Table = ({
  header,
  sortBy,
  total,
  onSort,
  loading,
  children,
  auto = false,
  sticky = false,
  className = "",
  pagination = true,
  page,
  onPageChange,
  pageSize = 10,
}) => {
  const [internalPage, setInternalPage] = useState(page || 1);
  useEffect(() => {
    if (typeof page === "number" && page !== internalPage) {
      setInternalPage(page);
    }
  }, [page, internalPage]);

  const resolvedPage = typeof page === "number" ? page : internalPage;
  const handleSetPage = onPageChange || setInternalPage;

  return (
    <>
      <div className={`no-scrollbar w-full overflow-x-auto overflow-y-visible ${className}`}>
        <table className={`w-full min-w-[600px] border-collapse ${auto ? "table-auto" : "table-fixed"}`}>
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
                        <h3 className={`text-sm font-semibold ${item.position === "right" ? "text-right" : item.position === "center" ? "text-center" : "text-left"}`}>
                          {item.title}
                          {item.key && onSort && (
                            <IoIosArrowDown className={`${sortBy === item.key ? "block" : "hidden group-hover:block"} absolute top-1/2 -right-4 -translate-y-1/2`} />
                          )}
                        </h3>
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
      </div>
      {pagination && <Pagination page={resolvedPage} setPage={handleSetPage} end={Math.ceil(total / pageSize) || 1} />}
    </>
  );
};

// https://www.systeme-de-design.gouv.fr/version-courante/fr/composants/pagination/code-de-la-pagination
const Pagination = ({ page, setPage, end }) => {
  const [pages, setPages] = useState([]);

  useEffect(() => {
    if (page < 1) setPage(1);
    if (page > end && end > 0) setPage(end);
    if (end > 5) {
      if (page < 4) {
        setPages(["1", "2", "3", "4", "...", end.toString()]);
      } else if (page > end - 3) {
        setPages(["1", "...", end - 2, end - 1, end.toString()]);
      } else {
        setPages(["1", "...", page - 1, page, page + 1, "...", end.toString()]);
      }
    } else {
      setPages([...Array(end).keys()].map((i) => (i + 1).toString()));
    }
  }, [end, page]);

  return (
    <nav role="navigation" aria-label="pagination" className="mt-4 flex flex-row items-center justify-center gap-1 text-sm">
      <ul className="flex flex-row flex-wrap items-center justify-start text-sm">
        <li>
          <button aria-label="Première page" className="pagination-btn" onClick={() => setPage(1)} disabled={page === 1} aria-disabled={page === 1}>
            <RiSkipLeftLine className="mt-1 text-base" aria-hidden="true" />
            <span className="sr-only">Première page</span>
          </button>
        </li>
        <li>
          <button className="pagination-btn" onClick={() => setPage(page - 1)} disabled={page === 1} aria-disabled={page === 1}>
            <RiArrowLeftSLine className="mt-1 mr-2" aria-hidden="true" />
            Page précédente
          </button>
        </li>

        {pages.map((p, index) => (
          <li key={index}>
            {p === "..." ? (
              <div className="mx-2 text-sm">{p}</div>
            ) : (
              <button
                aria-label={`Page ${p}`}
                aria-current={parseInt(p) === page ? "page" : undefined}
                className={`pagination-btn ${parseInt(p) === page ? "bg-blue-france text-white" : ""}`}
                onClick={() => setPage(parseInt(p))}
              >
                {p}
              </button>
            )}
          </li>
        ))}
        <li>
          <button aria-label="Page suivante" className="pagination-btn" onClick={() => setPage(page + 1)} disabled={page === end} aria-disabled={page === end}>
            Page suivante
            <RiArrowRightSLine className="mt-1 ml-2 text-base" aria-hidden="true" />
          </button>
        </li>
        <li>
          <button className="pagination-btn" onClick={() => setPage(end)} disabled={page === end} aria-label="Dernière page" aria-disabled={page === end}>
            <RiSkipRightLine className="mt-1 text-base" aria-hidden="true" />
            <span className="sr-only">Dernière page</span>
          </button>
        </li>
      </ul>
    </nav>
  );
};

export default Table;
