import { useEffect, useState } from "react";
import { BiFirstPage, BiLastPage } from "react-icons/bi";
import { MdNavigateBefore, MdNavigateNext } from "react-icons/md";

const Pagination = ({ page, setPage, end }) => {
  const [pages, setPages] = useState([...Array(end).keys()].map((i) => i + 1));

  useEffect(() => {
    if (page < 1) setPage(1);
    if (page > end) setPage(end);
    setPages([...Array(end).keys()].map((i) => i + 1));
  }, [end]);

  return (
    <div className="flex flex-row items-center justify-center gap-1 text-sm">
      <button
        className="flex h-8 w-8 items-center justify-center hover:bg-gray-hover disabled:opacity-60 disabled:hover:bg-transparent"
        onClick={() => setPage(1)}
        disabled={page === 1}
      >
        <BiFirstPage />
      </button>
      <button
        className="mr-4 flex h-8 items-center gap-1 px-2 hover:bg-gray-hover disabled:opacity-60 disabled:hover:bg-transparent"
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
              <button key={p} className={`flex h-8 w-8 items-center justify-center hover:bg-gray-hover ${p === page ? "bg-blue-dark text-white" : ""}`} onClick={() => setPage(p)}>
                {p}
              </button>
            ))}
            <button className="flex h-8 w-8 items-center justify-center hover:bg-gray-hover">...</button>
            <button className="flex h-8 w-8 items-center justify-center hover:bg-gray-hover" onClick={() => setPage(end)}>
              {end}
            </button>
          </>
        ) : page > end - 3 ? (
          <>
            <button className="flex h-8 w-8 items-center justify-center hover:bg-gray-hover" onClick={() => setPage(1)}>
              1
            </button>
            <button className="flex h-8 w-8 items-center justify-center hover:bg-gray-hover">...</button>
            {pages.slice(end - 4, end).map((p) => (
              <button key={p} className={`flex h-8 w-8 items-center justify-center hover:bg-gray-hover ${p === page ? "bg-blue-dark text-white" : ""}`} onClick={() => setPage(p)}>
                {p}
              </button>
            ))}
          </>
        ) : (
          <>
            <button className="flex h-8 w-8 items-center justify-center hover:bg-gray-hover" onClick={() => setPage(1)}>
              1
            </button>
            <button className="flex h-8 w-8 items-center justify-center hover:bg-gray-hover">...</button>
            {pages.slice(page - 2, page + 1).map((p) => (
              <button key={p} className={`flex h-8 w-8 items-center justify-center hover:bg-gray-hover ${p === page ? "bg-blue-dark text-white" : ""}`} onClick={() => setPage(p)}>
                {p}
              </button>
            ))}
            <button className="flex h-8 w-8 items-center justify-center hover:bg-gray-hover" disabled={true}>
              ...
            </button>
            <button className="flex h-8 w-8 items-center justify-center hover:bg-gray-hover" onClick={() => setPage(end)}>
              {end}
            </button>
          </>
        )
      ) : (
        pages.map((p) => (
          <button key={p} className={`flex h-8 w-8 items-center justify-center hover:bg-gray-hover ${p === page ? "bg-blue-dark text-white" : ""}`} onClick={() => setPage(p)}>
            {p}
          </button>
        ))
      )}
      <button
        className="ml-4 flex h-8 items-center gap-1 px-2 hover:bg-gray-hover disabled:opacity-60 disabled:hover:bg-transparent"
        onClick={() => setPage(page + 1)}
        disabled={page === end}
      >
        Page suivante
        <MdNavigateNext className="ml-1" />
      </button>
      <button
        className="flex h-8 w-8 items-center justify-center hover:bg-gray-hover disabled:opacity-60 disabled:hover:bg-transparent"
        onClick={() => setPage(end)}
        disabled={page === end}
      >
        <BiLastPage />
      </button>
    </div>
  );
};

export default Pagination;
