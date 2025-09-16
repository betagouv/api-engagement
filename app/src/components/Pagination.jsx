import { useEffect, useState } from "react";
import { BiFirstPage, BiLastPage } from "react-icons/bi";
import { MdNavigateBefore, MdNavigateNext } from "react-icons/md";

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

export default Pagination;
