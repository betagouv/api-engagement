import { useState } from "react";
import Pagination from "./Pagination";

export const Table = ({ data, renderHeader, renderItem, headerHeight = "h-12", itemHeight = "h-16", maxHeigth = "" }) => {
  if (!data) return <div className={`bg-gray-950 p-4 text-center text-sm font-bold text-black`}>Chargement...</div>;
  if (!data.length) return <div className={`bg-gray-950 p-4 text-center text-sm font-bold text-black`}>Aucune donnée</div>;

  return (
    <div className="w-full bg-[#f6f6f6]">
      <div className={`bg-gray-1000-active sticky top-0 flex items-center border-b border-b-black px-4 text-left text-sm font-bold text-black ${headerHeight}`}>
        {renderHeader()}
      </div>

      <div className={`overflow-y-scroll ${maxHeigth}`}>
        {data.map((d, i) => {
          const item = renderItem(d, i);
          const rowBgColor = i % 2 === 0 ? "bg-gray-975" : "bg-gray-1000-active";
          if (item)
            return (
              <div key={i} className={`border-b-gray-925 flex items-center border-b px-4 text-left text-xs text-black ${itemHeight} ${rowBgColor}`}>
                {item}
              </div>
            );
        })}
      </div>
    </div>
  );
};

export const TablePaginator = ({
  data,
  onPageChange,
  renderHeader,
  renderItem,
  length,
  headerHeight = "h-12",
  headerBackground = "bg-gray-100",
  itemHeight = "h-16",
  pageSize = 10,
  loading = false,
  page: controlledPage,
}) => {
  const [internalPage, setInternalPage] = useState(1);
  const currentPage = controlledPage ?? internalPage;

  const handlePageChange = (page) => {
    setInternalPage(page);
    if (onPageChange) onPageChange(page);
  };

  if (!data || loading) return <div className="bg-gray-975 p-4 text-center text-sm font-bold text-black">Chargement...</div>;
  if (!data.length) return <div className="bg-gray-100 p-4 text-center text-sm font-bold text-black">Aucune donnée sur cette période</div>;

  return (
    <div className="flex flex-col">
      <div className="w-full">
        <div className={`bg-gray-1000-active sticky flex items-center border-b border-b-black px-4 text-left text-sm font-bold text-black ${headerHeight} ${headerBackground}`}>
          {renderHeader()}
        </div>

        <div>
          {data.map((d, i) => {
            const item = renderItem(d, i);
            const rowBgColor = i % 2 === 0 ? "bg-gray-975" : "bg-gray-1000-active";

            if (item)
              return (
                <div key={i} className={`border-b-gray-925 flex items-center border-b px-4 text-left text-xs text-black ${itemHeight} ${rowBgColor}`}>
                  {item}
                </div>
              );
          })}
        </div>
      </div>
      <div className="mt-3">
        <Pagination page={currentPage} setPage={handlePageChange} end={parseInt(length / pageSize) + (length % pageSize !== 0 && 1)} />
      </div>
    </div>
  );
};

export default Table;
