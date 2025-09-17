import { IoIosArrowDown } from "react-icons/io";

import Loader from "./Loader";

const Table = ({ header, sortBy, total, onSort, loading, children, auto = false, sticky = false, className = "h-full" }) => {
  return (
    <div className={`no-scrollbar w-full overflow-x-auto ${className}`}>
      <table className={`w-full ${auto ? "table-auto" : "table-fixed"}`}>
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
  );
};

export default Table;
